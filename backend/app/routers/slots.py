from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.db import get_db
from app.models import Doctor, Service, Slot
from app.schemas import SlotCreate, SlotOut

router = APIRouter()

TZ = ZoneInfo(settings.timezone)


def to_slot_out(slot: Slot) -> SlotOut:
    booking = slot.booking
    return SlotOut(
        id=slot.id,
        doctor_id=slot.doctor_id,
        service_id=slot.service_id,
        start_at=slot.start_at,
        duration_minutes=slot.duration_minutes,
        status="booked" if booking else "available",
        patient_name=booking.patient_name if booking else None,
    )


@router.get("/slots", response_model=list[SlotOut])
def list_slots(
    doctor_id: int,
    week_start: date,
    service_id: int | None = None,
    db: Session = Depends(get_db),
):
    # The week is Monday 00:00 to the next Monday 00:00 in clinic time.
    # (Daylight saving makes a week 167 or 169 hours long, so build it from local dates.)
    monday = week_start - timedelta(days=week_start.weekday())
    start = datetime.combine(monday, time.min, tzinfo=TZ)
    end = datetime.combine(monday + timedelta(days=7), time.min, tzinfo=TZ)

    query = (
        select(Slot)
        .options(joinedload(Slot.booking))  # load bookings in the same query
        .where(Slot.doctor_id == doctor_id, Slot.start_at >= start, Slot.start_at < end)
        .order_by(Slot.start_at)
    )
    if service_id is not None:
        query = query.where(Slot.service_id == service_id)

    return [to_slot_out(slot) for slot in db.scalars(query).unique()]


@router.post("/slots", response_model=SlotOut, status_code=201)
def create_slot(data: SlotCreate, db: Session = Depends(get_db)):
    if db.get(Doctor, data.doctor_id) is None:
        raise HTTPException(404, "Doctor not found")
    if db.get(Service, data.service_id) is None:
        raise HTTPException(404, "Service not found")

    start_at = data.start_at
    if start_at.tzinfo is None:
        start_at = start_at.replace(tzinfo=TZ)
    end_at = start_at + timedelta(minutes=data.duration_minutes)

    if start_at <= datetime.now(timezone.utc):
        raise HTTPException(422, "The slot must start in the future")

    # Two time ranges overlap when each one starts before the other ends.
    existing_end = Slot.start_at + func.make_interval(0, 0, 0, 0, 0, Slot.duration_minutes)
    overlapping = db.scalars(
        select(Slot).where(
            Slot.doctor_id == data.doctor_id,
            Slot.start_at < end_at,
            existing_end > start_at,
        )
    ).first()
    if overlapping:
        clash_time = overlapping.start_at.astimezone(TZ).strftime("%H:%M")
        raise HTTPException(422, f"This overlaps with an existing slot at {clash_time}")

    slot = Slot(
        doctor_id=data.doctor_id,
        service_id=data.service_id,
        start_at=start_at,
        duration_minutes=data.duration_minutes,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return to_slot_out(slot)


@router.delete("/slots/{slot_id}", status_code=204)
def delete_slot(slot_id: int, db: Session = Depends(get_db)):
    slot = db.get(Slot, slot_id)
    if slot is None:
        raise HTTPException(404, "Slot not found")
    if slot.booking:
        raise HTTPException(409, "A booked slot cannot be deleted")
    db.delete(slot)
    db.commit()
    return Response(status_code=204)

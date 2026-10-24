from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import Booking, Slot
from app.schemas import BookingCreate, BookingOut

router = APIRouter()

TZ = ZoneInfo(settings.timezone)

SLOT_TAKEN = "Sorry, this slot was just booked"


def build_confirmation_message(slot: Slot, patient_name: str) -> str:
    """Plain template message. Phase 2 replaces this with Gemini and keeps it as the fallback."""
    when = slot.start_at.astimezone(TZ).strftime("%A, %d %B at %H:%M")
    return (
        f"Hi {patient_name}, your {slot.service.name} with {slot.doctor.name} "
        f"is confirmed for {when}. Please arrive a few minutes early. We look forward to seeing you!"
    )


@router.post("/bookings", response_model=BookingOut, status_code=201)
def create_booking(data: BookingCreate, db: Session = Depends(get_db)):
    slot = db.get(Slot, data.slot_id)
    if slot is None:
        raise HTTPException(404, "Slot not found")
    if slot.start_at <= datetime.now(timezone.utc):
        raise HTTPException(409, "This slot is in the past")
    # Friendly early check. It is NOT what prevents double booking (see IntegrityError below).
    if slot.booking:
        raise HTTPException(409, SLOT_TAKEN)

    booking = Booking(
        slot_id=slot.id,
        patient_name=data.patient_name,
        patient_email=data.patient_email,
        note=data.note,
        ai_message=build_confirmation_message(slot, data.patient_name),
    )
    db.add(booking)
    try:
        db.commit()
    except IntegrityError:
        # Two people booked at the same moment: the UNIQUE constraint on
        # bookings.slot_id let only one insert through. Undo ours and say so.
        db.rollback()
        raise HTTPException(409, SLOT_TAKEN)

    db.refresh(booking)
    return booking

import secrets
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import CANCELLATION_HOURS, settings
from app.db import get_db
from app.models import Booking, Slot
from app.schemas import BookingCreate, BookingCreated

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


@router.post("/bookings", response_model=BookingCreated, status_code=201)
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
        cancel_token=secrets.token_urlsafe(32),  # random and unguessable; only returned to the patient
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


@router.delete("/bookings/{booking_id}", status_code=204)
def cancel_booking(booking_id: int, token: str | None = None, db: Session = Depends(get_db)):
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(404, "Booking not found")

    # No login, so the secret token is the proof that this person made the booking.
    # A booking without a token (made before cancellation existed) can never be cancelled this way.
    # compare_digest takes the same time for right and wrong tokens, so the response time doesn't
    # give anything away. It needs bytes, because it fails on text with non-ASCII characters.
    if not token or booking.cancel_token is None:
        raise HTTPException(403, "Invalid cancellation token")
    if not secrets.compare_digest(token.encode(), booking.cancel_token.encode()):
        raise HTTPException(403, "Invalid cancellation token")

    # Less than 24 hours left (or the appointment already started or passed): too late.
    time_left = booking.slot.start_at - datetime.now(TZ)
    if time_left < timedelta(hours=CANCELLATION_HOURS):
        raise HTTPException(
            409, f"Appointments can only be cancelled up to {CANCELLATION_HOURS} hours before the start"
        )

    db.delete(booking)  # the slot is free again, because its booking row is gone
    db.commit()
    return Response(status_code=204)

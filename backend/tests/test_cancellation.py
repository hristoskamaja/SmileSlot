from datetime import datetime, timedelta, timezone

import pytest

from app.db import SessionLocal
from app.models import Booking, Slot
from tests.conftest import future_time


def book(client, slot_id):
    return client.post(
        "/api/bookings", json={"slot_id": slot_id, "patient_name": "Ana", "patient_email": "ana@example.com"}
    )


@pytest.fixture
def booking_at(doctor, service):
    """Put a booking straight into the database for a slot that starts at a chosen time.
    (The API refuses to book past slots, so some cases can only be set up this way.)"""

    def _make(starts_in: timedelta, token: str | None = "secret-token") -> int:
        with SessionLocal() as db:
            slot = Slot(
                doctor_id=doctor,
                service_id=service,
                start_at=datetime.now(timezone.utc) + starts_in,
                duration_minutes=20,
            )
            booking = Booking(
                slot=slot,
                patient_name="Ana",
                patient_email="ana@example.com",
                ai_message="See you soon!",
                cancel_token=token,
            )
            db.add(booking)
            db.commit()
            return booking.id

    return _make


def test_creating_a_booking_returns_a_cancel_token(client, make_slot):
    response = book(client, make_slot()["id"])

    assert response.status_code == 201
    assert response.json()["cancel_token"]


def test_cancelling_works_and_the_slot_can_be_booked_again(client, make_slot):
    slot = make_slot(future_time(days=3))
    created = book(client, slot["id"]).json()

    response = client.delete(f"/api/bookings/{created['id']}", params={"token": created["cancel_token"]})

    assert response.status_code == 204
    assert book(client, slot["id"]).status_code == 201  # the slot is free again


def test_wrong_token_returns_403(client, booking_at):
    booking_id = booking_at(timedelta(days=3))

    response = client.delete(f"/api/bookings/{booking_id}", params={"token": "not-the-token"})

    assert response.status_code == 403


def test_missing_token_returns_403(client, booking_at):
    booking_id = booking_at(timedelta(days=3))

    response = client.delete(f"/api/bookings/{booking_id}")

    assert response.status_code == 403


def test_non_ascii_token_returns_403_not_a_crash(client, booking_at):
    booking_id = booking_at(timedelta(days=3))

    response = client.delete(f"/api/bookings/{booking_id}", params={"token": "tökén"})

    assert response.status_code == 403


def test_a_booking_without_a_token_can_never_be_cancelled(client, booking_at):
    booking_id = booking_at(timedelta(days=3), token=None)

    response = client.delete(f"/api/bookings/{booking_id}", params={"token": "anything"})

    assert response.status_code == 403


def test_less_than_24_hours_before_the_start_returns_409(client, booking_at):
    booking_id = booking_at(timedelta(hours=5))

    response = client.delete(f"/api/bookings/{booking_id}", params={"token": "secret-token"})

    assert response.status_code == 409
    assert response.json() == {"detail": "Appointments can only be cancelled up to 24 hours before the start"}


def test_a_past_slot_returns_409(client, booking_at):
    booking_id = booking_at(timedelta(days=-1))

    response = client.delete(f"/api/bookings/{booking_id}", params={"token": "secret-token"})

    assert response.status_code == 409


def test_cancelling_a_missing_booking_returns_404(client):
    response = client.delete("/api/bookings/999", params={"token": "x"})

    assert response.status_code == 404


def test_the_cancel_token_is_not_in_the_slots_list(client, doctor, make_slot):
    slot = make_slot()
    token = book(client, slot["id"]).json()["cancel_token"]

    response = client.get("/api/slots", params={"doctor_id": doctor, "week_start": slot["start_at"][:10]})

    assert response.status_code == 200
    assert token not in response.text
    assert "cancel_token" not in response.text

from datetime import datetime, timedelta

import pytest

from app.config import settings
from app.db import SessionLocal
from app.models import Doctor
from tests.conftest import future_time

BOOKING = {"patient_name": "Ana", "patient_email": "ana@example.com"}


@pytest.fixture(autouse=True)
def calendar_configured(monkeypatch, doctor):
    """Give the test doctor a calendar id and pretend the service account is set up.
    (Without both, the app skips the calendar and never calls get_busy_intervals.)"""
    monkeypatch.setattr(settings, "google_service_account_json", "{}")
    with SessionLocal() as db:
        db.get(Doctor, doctor).google_calendar_id = "doctor@example.com"
        db.commit()


def mock_busy(monkeypatch, intervals):
    monkeypatch.setattr("app.routers.slots.get_busy_intervals", lambda *args, **kwargs: intervals)


def slot_range(slot: dict):
    start = datetime.fromisoformat(slot["start_at"])
    return start, start + timedelta(minutes=slot["duration_minutes"])


def week_slots(client, doctor, slot) -> list[dict]:
    response = client.get("/api/slots", params={"doctor_id": doctor, "week_start": slot["start_at"][:10]})
    assert response.status_code == 200
    return response.json()


def test_overlapping_busy_interval_marks_slot_calendar_busy(client, doctor, make_slot, monkeypatch):
    slot = make_slot(future_time(hour=10))  # 10:00 - 10:20
    start, end = slot_range(slot)
    mock_busy(monkeypatch, [(start + timedelta(minutes=10), end + timedelta(minutes=30))])  # starts mid-slot

    assert week_slots(client, doctor, slot)[0]["status"] == "calendar_busy"


def test_touching_busy_intervals_do_not_overlap(client, doctor, make_slot, monkeypatch):
    slot = make_slot(future_time(hour=10))
    start, end = slot_range(slot)
    # One busy period ends exactly when the slot starts, the next starts exactly when it ends.
    mock_busy(monkeypatch, [(start - timedelta(hours=1), start), (end, end + timedelta(hours=1))])

    assert week_slots(client, doctor, slot)[0]["status"] == "available"


def test_booked_slot_stays_booked_even_if_calendar_is_busy(client, doctor, make_slot, monkeypatch):
    slot = make_slot(future_time(hour=10))
    assert client.post("/api/bookings", json={"slot_id": slot["id"], **BOOKING}).status_code == 201
    start, end = slot_range(slot)
    mock_busy(monkeypatch, [(start, end)])

    assert week_slots(client, doctor, slot)[0]["status"] == "booked"


def test_booking_a_calendar_busy_slot_returns_409(client, make_slot, monkeypatch):
    slot = make_slot(future_time(hour=10))
    start, end = slot_range(slot)
    mock_busy(monkeypatch, [(start, end)])

    response = client.post("/api/bookings", json={"slot_id": slot["id"], **BOOKING})

    assert response.status_code == 409
    assert response.json()["detail"] == "The doctor is busy at this time"


def test_calendar_failure_does_not_break_slots_or_booking(client, doctor, make_slot, monkeypatch):
    slot = make_slot(future_time(hour=10))

    def broken(*args, **kwargs):
        raise TimeoutError("Google is down")

    monkeypatch.setattr("app.routers.slots.get_busy_intervals", broken)

    assert week_slots(client, doctor, slot)[0]["status"] == "available"
    assert client.post("/api/bookings", json={"slot_id": slot["id"], **BOOKING}).status_code == 201

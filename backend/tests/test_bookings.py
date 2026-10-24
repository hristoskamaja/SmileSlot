from datetime import datetime, timedelta, timezone

from app.db import SessionLocal
from app.models import Slot


def book(client, slot_id, name="Ana", email="ana@example.com"):
    return client.post("/api/bookings", json={"slot_id": slot_id, "patient_name": name, "patient_email": email})


def test_booking_a_slot_succeeds(client, make_slot):
    slot = make_slot()

    response = book(client, slot["id"])

    assert response.status_code == 201
    body = response.json()
    assert body["patient_name"] == "Ana"
    assert body["ai_message"]  # the template message is filled in


def test_double_booking_returns_409(client, make_slot):
    slot = make_slot()

    first = book(client, slot["id"], name="Ana", email="ana@example.com")
    second = book(client, slot["id"], name="Boris", email="boris@example.com")

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json() == {"detail": "Sorry, this slot was just booked"}


def test_unique_constraint_returns_409_even_if_the_early_check_misses(client, make_slot, monkeypatch):
    """Simulates two simultaneous requests: both pass the early check, the database stops the second."""
    from app.models import Slot as SlotModel

    slot = make_slot()
    assert book(client, slot["id"]).status_code == 201

    # Make the early "is it booked?" check blind, so only the UNIQUE constraint can catch it.
    monkeypatch.setattr(SlotModel, "booking", None)

    response = book(client, slot["id"], name="Boris", email="boris@example.com")

    assert response.status_code == 409
    assert response.json() == {"detail": "Sorry, this slot was just booked"}


def test_booking_a_past_slot_is_rejected(client, make_slot):
    slot = make_slot()
    # Move the slot into the past directly in the database (the API refuses to create one).
    with SessionLocal() as db:
        db.get(Slot, slot["id"]).start_at = datetime.now(timezone.utc) - timedelta(hours=1)
        db.commit()

    response = book(client, slot["id"])

    assert response.status_code == 409
    assert response.json() == {"detail": "This slot is in the past"}


def test_invalid_email_returns_422(client, make_slot):
    slot = make_slot()

    response = book(client, slot["id"], email="not-an-email")

    assert response.status_code == 422
    assert "patient_email" in response.json()["detail"]


def test_booking_a_missing_slot_returns_404(client):
    assert book(client, 999).status_code == 404


def test_ai_message_is_stored_when_gemini_works(client, make_slot, monkeypatch):
    message = "Hi Ana!\n- Arrive 10 minutes early"
    monkeypatch.setattr(
        "app.routers.bookings.generate_confirmation",
        lambda patient_name, doctor_name, service_name, when: message,
    )

    response = book(client, make_slot()["id"])

    assert response.status_code == 201
    assert response.json()["ai_message"] == message


def test_booking_still_works_when_the_ai_fails(client, make_slot, monkeypatch):
    def broken_ai(*args, **kwargs):
        raise TimeoutError("Gemini is too slow")

    monkeypatch.setattr("app.routers.bookings.generate_confirmation", broken_ai)

    response = book(client, make_slot()["id"])

    assert response.status_code == 201
    assert "is confirmed for" in response.json()["ai_message"]  # the template text


def test_ai_is_not_called_for_a_booked_slot(client, make_slot, monkeypatch):
    slot = make_slot()
    book(client, slot["id"])
    calls = []
    monkeypatch.setattr("app.routers.bookings.generate_confirmation", lambda *args: calls.append(1) or "x")

    second = book(client, slot["id"], email="boris@example.com")

    assert second.status_code == 409
    assert calls == []

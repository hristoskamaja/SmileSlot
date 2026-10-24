from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from tests.conftest import future_time


def test_overlapping_slot_returns_422(client, doctor, service, make_slot):
    make_slot(future_time(hour=10, minute=0), duration_minutes=30)  # 10:00-10:30

    response = client.post(
        "/api/slots",
        json={"doctor_id": doctor, "service_id": service, "start_at": future_time(hour=10, minute=15), "duration_minutes": 20},
    )

    assert response.status_code == 422
    assert "overlaps" in response.json()["detail"]


def test_back_to_back_slots_are_allowed(make_slot):
    make_slot(future_time(hour=10, minute=0), duration_minutes=30)  # ends 10:30
    make_slot(future_time(hour=10, minute=30), duration_minutes=30)  # starts 10:30


def test_slot_in_the_past_is_rejected(client, doctor, service):
    past = (datetime.now(ZoneInfo("Europe/Skopje")) - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S")

    response = client.post(
        "/api/slots",
        json={"doctor_id": doctor, "service_id": service, "start_at": past, "duration_minutes": 20},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "The slot must start in the future"


def test_zero_duration_is_rejected(client, doctor, service):
    response = client.post(
        "/api/slots",
        json={"doctor_id": doctor, "service_id": service, "start_at": future_time(), "duration_minutes": 0},
    )

    assert response.status_code == 422
    assert "detail" in response.json()


def test_deleting_a_booked_slot_returns_409(client, make_slot):
    slot = make_slot()
    client.post("/api/bookings", json={"slot_id": slot["id"], "patient_name": "Ana", "patient_email": "ana@example.com"})

    response = client.delete(f"/api/slots/{slot['id']}")

    assert response.status_code == 409


def test_deleting_a_free_slot_works(client, make_slot):
    slot = make_slot()

    assert client.delete(f"/api/slots/{slot['id']}").status_code == 204
    assert client.delete(f"/api/slots/{slot['id']}").status_code == 404


def test_week_listing_shows_booked_status_and_patient_name(client, doctor, make_slot):
    slot = make_slot()
    client.post("/api/bookings", json={"slot_id": slot["id"], "patient_name": "Ana", "patient_email": "ana@example.com"})

    week_start = (datetime.now(ZoneInfo("Europe/Skopje")) + timedelta(days=2)).date().isoformat()
    response = client.get("/api/slots", params={"doctor_id": doctor, "week_start": week_start})

    assert response.status_code == 200
    [listed] = response.json()
    assert listed["status"] == "booked"
    assert listed["patient_name"] == "Ana"

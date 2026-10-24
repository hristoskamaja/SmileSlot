import pytest

from tests.test_bookings import book


def stored_phone(client, slot_id):
    return client.get(f"/api/slots/{slot_id}/booking").json()["patient_phone"]


@pytest.mark.parametrize("phone", ["+389 70 123-456", "(02) 123 456", "123456", "1" * 20])
def test_valid_phone_is_accepted(client, make_slot, phone):
    slot = make_slot()

    assert book(client, slot["id"], patient_phone=phone).status_code == 201
    assert stored_phone(client, slot["id"]) == phone


def test_phone_is_trimmed(client, make_slot):
    slot = make_slot()

    book(client, slot["id"], patient_phone="  070 123 456  ")

    assert stored_phone(client, slot["id"]) == "070 123 456"


@pytest.mark.parametrize("extra", [{}, {"patient_phone": None}, {"patient_phone": ""}, {"patient_phone": "   "}])
def test_missing_or_empty_phone_counts_as_not_provided(client, make_slot, extra):
    slot = make_slot()

    assert book(client, slot["id"], **extra).status_code == 201
    assert stored_phone(client, slot["id"]) is None


@pytest.mark.parametrize("phone", ["12345", "1" * 21, "070-abc-123", "070.123.456", "070 123 456 #"])
def test_invalid_phone_returns_422(client, make_slot, phone):
    response = book(client, make_slot()["id"], patient_phone=phone)

    assert response.status_code == 422
    assert "patient_phone" in response.json()["detail"]


def test_booking_response_does_not_echo_the_phone(client, make_slot):
    response = book(client, make_slot()["id"], patient_phone="070 123 456")

    assert "patient_phone" not in response.json()


def test_booking_details_for_a_booked_slot(client, make_slot):
    slot = make_slot()
    book(client, slot["id"], name="Ana", email="ana@example.com", patient_phone="070 123 456", note="Nervous")

    response = client.get(f"/api/slots/{slot['id']}/booking")

    assert response.status_code == 200
    body = response.json()
    assert body["patient_name"] == "Ana"
    assert body["patient_email"] == "ana@example.com"
    assert body["patient_phone"] == "070 123 456"
    assert body["note"] == "Nervous"
    assert body["created_at"]
    assert "cancel_token" not in body  # the secret never leaves POST /bookings


def test_booking_details_returns_404_for_a_slot_without_booking(client, make_slot):
    slot = make_slot()

    assert client.get(f"/api/slots/{slot['id']}/booking").status_code == 404


def test_booking_details_returns_404_for_an_unknown_slot(client):
    assert client.get("/api/slots/999/booking").status_code == 404


def test_public_slots_list_never_contains_contact_details(client, doctor, make_slot):
    slot = make_slot()
    book(client, slot["id"], name="Ana", email="ana@example.com", patient_phone="070 123 456", note="Secret note")

    response = client.get("/api/slots", params={"doctor_id": doctor, "week_start": slot["start_at"][:10]})

    assert response.status_code == 200
    booked = response.json()[0]
    assert booked["patient_name"] == "Ana"  # still there, the clinic view uses it
    for key in ("patient_email", "patient_phone", "note"):
        assert key not in booked
    # And the values do not leak under any other key either.
    for secret in ("ana@example.com", "070 123 456", "Secret note"):
        assert secret not in response.text

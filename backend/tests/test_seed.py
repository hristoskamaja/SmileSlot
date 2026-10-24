from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select

from app import seed
from app.config import settings
from app.db import SessionLocal
from app.models import Booking, Doctor, Slot

TZ = ZoneInfo("Europe/Skopje")


def load_slots():
    with SessionLocal() as db:
        return list(db.scalars(select(Slot).order_by(Slot.doctor_id, Slot.start_at)))


def test_seed_slots_do_not_overlap_and_end_by_18():
    seed.main()

    previous_end = {}  # doctor id -> end of that doctor's previous slot
    for slot in load_slots():
        start = slot.start_at.astimezone(TZ)
        end = start + timedelta(minutes=slot.duration_minutes)
        assert start.weekday() != 6  # never on Sunday
        assert end.date() == start.date() and end.time() <= time(18, 0)
        assert start >= previous_end.get(slot.doctor_id, start)  # starts after the previous one ends
        previous_end[slot.doctor_id] = end


def test_seed_dates_are_relative_to_today():
    seed.main()
    now = datetime.now(TZ)
    starts = [s.start_at for s in load_slots()]

    assert min(starts) < now  # a few past days
    assert max(starts) < now + timedelta(weeks=4)  # up to the end of the third week ahead
    assert max(starts) > now + timedelta(weeks=2)


def test_every_doctor_offers_all_four_services():
    seed.main()
    services_by_doctor = {}
    for slot in load_slots():
        services_by_doctor.setdefault(slot.doctor_id, set()).add(slot.service_id)

    assert len(services_by_doctor) == 3
    assert all(len(ids) == 4 for ids in services_by_doctor.values())


def test_seed_books_30_to_40_percent_of_future_slots_and_some_past_ones():
    seed.main()
    now = datetime.now(TZ)
    with SessionLocal() as db:
        future = past = future_booked = past_booked = 0
        for slot in db.scalars(select(Slot)):
            is_future = slot.start_at > now
            future += is_future
            past += not is_future
            if slot.booking:
                future_booked += is_future
                past_booked += not is_future

    assert 0.30 <= future_booked / future <= 0.40
    assert 0 < past_booked <= past


def test_seeded_bookings_look_like_fake_data_and_cannot_be_cancelled():
    seed.main()
    with SessionLocal() as db:
        bookings = list(db.scalars(select(Booking)))

    assert bookings
    assert all(b.patient_email.endswith("@example.com") for b in bookings)
    assert all(b.cancel_token is None for b in bookings)
    # A mix: some with a phone or a note, some without.
    assert any(b.patient_phone for b in bookings) and any(not b.patient_phone for b in bookings)
    assert any(b.note for b in bookings) and any(not b.note for b in bookings)
    assert len({b.patient_name for b in bookings}) > 5


def test_running_the_seed_twice_gives_the_same_data():
    seed.main()
    with SessionLocal() as db:
        first = (db.scalar(select(func.count(Slot.id))), db.scalar(select(func.count(Booking.id))))
    seed.main()
    with SessionLocal() as db:
        second = (db.scalar(select(func.count(Slot.id))), db.scalar(select(func.count(Booking.id))))

    assert first == second


def test_demo_calendar_id_goes_to_the_first_doctor_only(monkeypatch):
    monkeypatch.setattr(settings, "demo_calendar_id", "demo@example.com")
    seed.main()
    with SessionLocal() as db:
        calendar_ids = [d.google_calendar_id for d in db.scalars(select(Doctor).order_by(Doctor.id))]

    assert calendar_ids == ["demo@example.com", None, None]


def test_no_calendar_id_without_the_env_variable(monkeypatch):
    monkeypatch.setattr(settings, "demo_calendar_id", "")
    seed.main()
    with SessionLocal() as db:
        assert all(d.google_calendar_id is None for d in db.scalars(select(Doctor)))

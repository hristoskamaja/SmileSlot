"""Fill the database with sample data. Run with:  python -m app.seed

Warning: this deletes all existing data first, so it can be run again safely.

All dates are relative to today (clinic time), so the demo always looks alive:
a few past days, the current week and the next 3 weeks. A fixed random seed makes the
result the same every time it is run on the same day.
"""

import random
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import text

from app.config import settings
from app.db import SessionLocal
from app.models import Booking, Doctor, Service, Slot

TZ = ZoneInfo(settings.timezone)

DOCTORS = [
    {"name": "Dr. Elena Petrova", "specialty": "General Dentistry", "color": "#0ea5e9"},
    {"name": "Dr. Marko Nikolov", "specialty": "Restorative Dentistry", "color": "#8b5cf6"},
    {"name": "Dr. Ana Stojanova", "specialty": "Cosmetic Dentistry", "color": "#f59e0b"},
]

SERVICES = [
    {"name": "Check-up", "duration_minutes": 20, "description": "Routine examination of teeth and gums."},
    {"name": "Cleaning", "duration_minutes": 30, "description": "Professional removal of plaque and tartar."},
    {"name": "Filling", "duration_minutes": 60, "description": "Repair of a tooth affected by a cavity."},
    {"name": "Whitening", "duration_minutes": 45, "description": "In-clinic teeth whitening treatment."},
]

# Times are in minutes after midnight, e.g. 9 * 60 + 30 = 09:30.
# Each doctor starts at a different time (the same order as DOCTORS).
SHIFT_STARTS = [8 * 60 + 30, 9 * 60, 10 * 60]
WEEKDAY_END = 18 * 60
SATURDAY_END = 13 * 60  # Saturday is a half day
LUNCH_START = 13 * 60
LUNCH_END = 14 * 60
GAPS = [0, 15, 30]  # a random pause between two appointments, in minutes
STEP = 15  # slots start on a quarter of an hour, like the "Add slot" form

PAST_DAYS = 4  # how many days before today get slots
WEEKS_AHEAD = 3  # full weeks after the current one
FUTURE_BOOKED_SHARE = 0.35
PAST_BOOKINGS = 6

PATIENTS = [
    "Ivana Trajkovska", "Petar Ilievski", "Marija Dimitrova", "Stefan Kostov", "Jovana Angelova",
    "Nikola Georgiev", "Elena Mitreska", "Aleksandar Pavlov", "Teodora Ristova", "Filip Naumov",
    "Simona Jovanovska", "Darko Spasov", "Katerina Bogdanova", "Martin Todorov", "Biljana Stankova",
    "Viktor Atanasov", "Sara Velkovska", "Goran Krstev", "Lidija Markovska", "Borjan Zdravkov",
]

NOTES = [
    "First visit, a bit nervous.",
    "Prefer an early appointment if possible.",
    "I wear braces.",
    "Please call before the visit.",
    "Sensitive teeth.",
    "Coming with my child.",
]


def monday_of(day: date) -> date:
    return day - timedelta(days=day.weekday())


def make_day_times(rng: random.Random, services: list[Service], start: int, end: int) -> list[tuple[int, Service]]:
    """One doctor's day: a list of (start minute, service), one after the other.
    They never overlap, skip the lunch hour, and always end by `end`."""
    day = []
    cursor = start
    index = rng.randrange(len(services))  # the services take turns, so every doctor offers all four
    while True:
        service = services[index % len(services)]
        # A slot that would touch the lunch hour starts after it instead.
        if cursor < LUNCH_END and cursor + service.duration_minutes > LUNCH_START:
            cursor = LUNCH_END
        if cursor + service.duration_minutes > end:
            return day
        day.append((cursor, service))
        cursor += service.duration_minutes + rng.choice(GAPS)
        cursor = -(-cursor // STEP) * STEP  # round up to the next quarter of an hour
        index += 1


def make_booking(rng: random.Random, slot: Slot) -> Booking:
    name = rng.choice(PATIENTS)
    phone = f"+389 7{rng.randint(0, 9)} {rng.randint(100, 999)} {rng.randint(100, 999)}" if rng.random() < 0.5 else None
    note = rng.choice(NOTES) if rng.random() < 0.35 else None
    return Booking(
        slot=slot,
        patient_name=name,
        patient_email=name.lower().replace(" ", ".") + "@example.com",
        patient_phone=phone,
        note=note,
        ai_message="See you soon!",  # seeded bookings have no cancel_token, so they cannot be cancelled
    )


def main() -> None:
    rng = random.Random(42)  # fixed seed: the same choices every run
    db = SessionLocal()
    try:
        # Empty all tables and reset the id counters.
        db.execute(text("TRUNCATE bookings, slots, services, doctors RESTART IDENTITY CASCADE"))

        doctors = [Doctor(**d) for d in DOCTORS]
        # The calendar id is never committed: it only comes from the environment, and only for the first doctor.
        doctors[0].google_calendar_id = settings.demo_calendar_id or None
        services = [Service(**s) for s in SERVICES]
        db.add_all(doctors + services)

        now = datetime.now(TZ)
        first_day = now.date() - timedelta(days=PAST_DAYS)
        last_day = monday_of(now.date()) + timedelta(weeks=WEEKS_AHEAD, days=5)  # the Saturday of the last week

        slots = []
        for offset in range((last_day - first_day).days + 1):
            day = first_day + timedelta(days=offset)
            if day.weekday() == 6:  # the clinic is closed on Sunday
                continue
            end = SATURDAY_END if day.weekday() == 5 else WEEKDAY_END
            for doctor, shift_start in zip(doctors, SHIFT_STARTS):
                for minute, service in make_day_times(rng, services, shift_start, end):
                    start_at = datetime.combine(day, time(minute // 60, minute % 60), tzinfo=TZ)
                    slots.append(
                        Slot(doctor=doctor, service=service, start_at=start_at, duration_minutes=service.duration_minutes)
                    )
        db.add_all(slots)

        # About 35% of the future slots are booked, plus a few past ones.
        future = [s for s in slots if s.start_at > now]
        past = [s for s in slots if s.start_at <= now]
        booked = rng.sample(future, round(len(future) * FUTURE_BOOKED_SHARE))
        booked += rng.sample(past, min(PAST_BOOKINGS, len(past)))
        db.add_all([make_booking(rng, slot) for slot in booked])

        db.commit()
        print(f"Seeded {len(doctors)} doctors, {len(services)} services, {len(slots)} slots, {len(booked)} bookings.")
    finally:
        db.close()


if __name__ == "__main__":
    main()

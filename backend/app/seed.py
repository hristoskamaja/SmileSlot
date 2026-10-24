"""Fill the database with sample data. Run with:  python -m app.seed

Warning: this deletes all existing data first, so it can be run again safely.
"""

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

# One weekly schedule per doctor: (day offset from Monday, start time, service name).
# Times within a day never overlap.
SCHEDULES = [
    [(0, "09:00", "Check-up"), (0, "10:00", "Cleaning"), (1, "11:00", "Filling"),
     (2, "09:30", "Check-up"), (3, "14:00", "Cleaning"), (4, "10:00", "Check-up"),
     (5, "09:00", "Cleaning")],
    [(0, "13:00", "Filling"), (1, "09:00", "Check-up"), (2, "11:00", "Filling"),
     (3, "09:00", "Cleaning"), (4, "15:00", "Filling"), (5, "10:00", "Check-up")],
    [(0, "11:00", "Whitening"), (1, "14:00", "Whitening"), (2, "16:00", "Check-up"),
     (3, "10:30", "Whitening"), (4, "12:00", "Cleaning"), (5, "11:00", "Whitening")],
]


def monday_of(day: date) -> date:
    return day - timedelta(days=day.weekday())


def main() -> None:
    db = SessionLocal()
    try:
        # Empty all tables and reset the id counters.
        db.execute(text("TRUNCATE bookings, slots, services, doctors RESTART IDENTITY CASCADE"))

        doctors = [Doctor(**d) for d in DOCTORS]
        services = {s["name"]: Service(**s) for s in SERVICES}
        db.add_all(doctors + list(services.values()))

        # Seed this week and next week, so there are always future slots to book
        # (e.g. when the seed is run on a Saturday).
        this_monday = monday_of(datetime.now(TZ).date())
        slots = []
        for week_start in (this_monday, this_monday + timedelta(weeks=1)):
            for doctor, schedule in zip(doctors, SCHEDULES):
                for day_offset, start, service_name in schedule:
                    service = services[service_name]
                    start_at = datetime.combine(
                        week_start + timedelta(days=day_offset),
                        time.fromisoformat(start),
                        tzinfo=TZ,
                    )
                    slots.append(
                        Slot(
                            doctor=doctor,
                            service=service,
                            start_at=start_at,
                            duration_minutes=service.duration_minutes,
                        )
                    )
        db.add_all(slots)

        # Book two of next week's slots so the "booked" state is visible.
        next_week_slots = [s for s in slots if s.start_at.date() >= this_monday + timedelta(weeks=1)]
        db.add_all([
            Booking(slot=next_week_slots[0], patient_name="Ivana Trajkovska",
                    patient_email="ivana@example.com", ai_message="See you soon!"),
            Booking(slot=next_week_slots[3], patient_name="Petar Ilievski",
                    patient_email="petar@example.com", ai_message="See you soon!"),
        ])

        db.commit()
        print(f"Seeded {len(doctors)} doctors, {len(services)} services, {len(slots)} slots, 2 bookings.")
    finally:
        db.close()


if __name__ == "__main__":
    main()

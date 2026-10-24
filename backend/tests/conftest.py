import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

TEST_DB_NAME = "smileslot_test"
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    f"postgresql+psycopg://smileslot:smileslot@localhost:5433/{TEST_DB_NAME}",
)

# Point the app at the test database BEFORE the app is imported. Real environment
# variables win over backend/.env, so the dev database URL is never used in tests.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Doctor, Service  # noqa: E402


def pytest_sessionstart(session):
    # Safety net: tests empty every table, so refuse to run on anything but the test database.
    name = engine.url.database
    if name != TEST_DB_NAME:
        pytest.exit(f"Refusing to run: database is '{name}', tests only run on '{TEST_DB_NAME}'.", returncode=2)

    # Create the test database on first run (CREATE DATABASE needs autocommit).
    admin_engine = create_engine(make_url(TEST_DATABASE_URL).set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        exists = conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": TEST_DB_NAME}).scalar()
        if not exists:
            conn.execute(text(f"CREATE DATABASE {TEST_DB_NAME}"))
    admin_engine.dispose()

    # Rebuild the tables from the models, so a test database made before a new column was
    # added doesn't keep the old shape (create_all alone never alters existing tables).
    # Safe: the name check above guarantees this is the disposable test database.
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


@pytest.fixture(autouse=True)
def clean_tables():
    """Start every test with empty tables."""
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE bookings, slots, services, doctors RESTART IDENTITY CASCADE"))


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def doctor():
    with SessionLocal() as db:
        row = Doctor(name="Dr. Test", specialty="General", color="#0ea5e9")
        db.add(row)
        db.commit()
        return row.id


@pytest.fixture
def service():
    with SessionLocal() as db:
        row = Service(name="Check-up", duration_minutes=20, description="Routine exam")
        db.add(row)
        db.commit()
        return row.id


def future_time(days: int = 2, hour: int = 10, minute: int = 0) -> str:
    """A clinic-time (Europe/Skopje) timestamp in the future, as an ISO string without offset."""
    day = datetime.now(ZoneInfo("Europe/Skopje")) + timedelta(days=days)
    return day.replace(hour=hour, minute=minute, second=0, microsecond=0).strftime("%Y-%m-%dT%H:%M:%S")


@pytest.fixture
def make_slot(client, doctor, service):
    """Create a slot through the API and return its JSON."""

    def _make(start_at: str | None = None, duration_minutes: int = 20):
        response = client.post(
            "/api/slots",
            json={
                "doctor_id": doctor,
                "service_id": service,
                "start_at": start_at or future_time(),
                "duration_minutes": duration_minutes,
            },
        )
        assert response.status_code == 201, response.text
        return response.json()

    return _make

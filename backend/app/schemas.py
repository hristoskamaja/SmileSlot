from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class DoctorOut(BaseModel):
    # from_attributes lets Pydantic read values straight from SQLAlchemy objects.
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    specialty: str
    color: str
    google_calendar_id: str | None


class ServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    duration_minutes: int
    description: str


class SlotCreate(BaseModel):
    doctor_id: int
    service_id: int
    # A time without an offset (e.g. "2026-11-02T09:00") is read as Europe/Skopje.
    start_at: datetime
    duration_minutes: int = Field(gt=0, description="Must be a positive number of minutes")


class SlotOut(BaseModel):
    id: int
    doctor_id: int
    service_id: int
    start_at: datetime
    duration_minutes: int
    # Computed, never stored. "calendar_busy" is added in a later phase.
    status: Literal["available", "booked", "calendar_busy"]
    patient_name: str | None = None  # only set when booked (for the clinic view)


class BookingCreate(BaseModel):
    slot_id: int
    patient_name: str = Field(min_length=1, max_length=100)
    patient_email: EmailStr
    note: str | None = Field(default=None, max_length=500)

    @field_validator("patient_name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name must not be empty")
        return value


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slot_id: int
    patient_name: str
    patient_email: str
    note: str | None
    ai_message: str
    created_at: datetime

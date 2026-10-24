from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    specialty: Mapped[str] = mapped_column(String(100))
    color: Mapped[str] = mapped_column(String(20))  # hex color, e.g. "#0ea5e9"
    google_calendar_id: Mapped[str | None] = mapped_column(String(255))

    slots: Mapped[list["Slot"]] = relationship(back_populates="doctor")


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    duration_minutes: Mapped[int]
    description: Mapped[str] = mapped_column(Text)


class Slot(Base):
    __tablename__ = "slots"

    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), index=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"))
    # timezone=True -> Postgres "timestamptz": stored in UTC, converted on display.
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    duration_minutes: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    doctor: Mapped[Doctor] = relationship(back_populates="slots")
    service: Mapped[Service] = relationship()
    booking: Mapped["Booking | None"] = relationship(back_populates="slot")


class Booking(Base):
    __tablename__ = "bookings"
    # The real protection against double booking: the database itself
    # refuses a second booking row for the same slot.
    __table_args__ = (UniqueConstraint("slot_id", name="uq_bookings_slot_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    slot_id: Mapped[int] = mapped_column(ForeignKey("slots.id"))
    patient_name: Mapped[str] = mapped_column(String(100))
    patient_email: Mapped[str] = mapped_column(String(255))
    note: Mapped[str | None] = mapped_column(Text)
    ai_message: Mapped[str] = mapped_column(Text)
    # A secret that only the patient who booked knows. It is needed to cancel the booking.
    # Nullable so bookings made before cancellation existed (e.g. the seeded ones) still work.
    cancel_token: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    slot: Mapped[Slot] = relationship(back_populates="booking")

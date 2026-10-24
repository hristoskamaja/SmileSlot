from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Doctor
from app.schemas import DoctorOut

router = APIRouter()


@router.get("/doctors", response_model=list[DoctorOut])
def list_doctors(db: Session = Depends(get_db)):
    return db.scalars(select(Doctor).order_by(Doctor.id)).all()

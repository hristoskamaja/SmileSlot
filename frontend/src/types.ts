// These types mirror the backend response schemas (backend/app/schemas.py).

export type Doctor = {
  id: number
  name: string
  specialty: string
  color: string
  google_calendar_id: string | null
}

export type Service = {
  id: number
  name: string
  duration_minutes: number
  description: string
}

export type SlotStatus = 'available' | 'booked' | 'calendar_busy'

export type Slot = {
  id: number
  doctor_id: number
  service_id: number
  start_at: string // ISO timestamp with offset, e.g. "2026-10-19T08:00:00+02:00"
  duration_minutes: number
  status: SlotStatus
  patient_name: string | null
}

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

// What the booking form sends to POST /bookings.
export type BookingInput = {
  slot_id: number
  patient_name: string
  patient_email: string
  note?: string
}

export type Booking = {
  id: number
  slot_id: number
  patient_name: string
  patient_email: string
  note: string | null
  ai_message: string
  created_at: string
}

// The response to creating a booking. Only here does the backend send the secret
// cancel_token, which the patient needs to cancel later.
export type CreatedBooking = Booking & { cancel_token: string }

// What the "Add slot" form sends to POST /slots.
export type SlotInput = {
  doctor_id: number
  service_id: number
  start_at: string // "2026-10-26T09:00": no offset, so the backend reads it as clinic time
  duration_minutes: number
}

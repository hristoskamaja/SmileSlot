import { useQuery } from '@tanstack/react-query'
import type { Slot } from '@/types'

const STORAGE_KEY = 'smileslot-my-bookings'

// A booking can be cancelled until this many hours before it starts. Same value as
// CANCELLATION_HOURS in the backend, which is the one that really enforces it.
export const CANCELLATION_HOURS = 24

// There is no login, so the bookings made in this browser are remembered in localStorage.
export type MyBooking = {
  slot_id: number
  start_at: string
  duration_minutes: number
  doctor_name: string
  service_name: string
  patient_name: string
  // Needed to cancel. Missing on entries saved before cancellation existed.
  booking_id?: number
  cancel_token?: string
}

export type CancellableBooking = MyBooking & { booking_id: number; cancel_token: string }

export function isCancellable(booking: MyBooking): booking is CancellableBooking {
  return booking.booking_id !== undefined && !!booking.cancel_token
}

// Storage can be blocked (private mode, browser settings), so every access is wrapped in try/catch.
export function getMyBookings(): MyBooking[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    const bookings = saved ? JSON.parse(saved) : []
    return Array.isArray(bookings) ? bookings : []
  } catch {
    return []
  }
}

export function saveMyBooking(booking: MyBooking) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...getMyBookings(), booking]))
  } catch {
    // Storage is blocked: the booking still exists, it just won't be highlighted as "yours".
  }
}

export function removeMyBooking(bookingId: number) {
  try {
    const remaining = getMyBookings().filter((booking) => booking.booking_id !== bookingId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining))
  } catch {
    // Storage is blocked: nothing was saved, so there is nothing to remove.
  }
}

// Is there still enough time before the appointment to cancel it?
export function canCancelBooking(booking: MyBooking): boolean {
  const hoursLeft = (new Date(booking.start_at).getTime() - Date.now()) / (60 * 60 * 1000)
  return hoursLeft >= CANCELLATION_HOURS
}

// A booked slot is mine only if its id AND its start time match a saved booking.
// The start time protects against ids that are reused after the database is reseeded.
export function isMyBooking(slot: Slot, bookings: MyBooking[]): boolean {
  return (
    slot.status === 'booked' &&
    bookings.some(
      (booking) =>
        booking.slot_id === slot.id && new Date(booking.start_at).getTime() === new Date(slot.start_at).getTime(),
    )
  )
}

// Bookings that have not started yet, soonest first.
export function upcomingBookings(bookings: MyBooking[]): MyBooking[] {
  const now = Date.now()
  return bookings
    .filter((booking) => new Date(booking.start_at).getTime() > now)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
}

// The saved bookings as a TanStack Query, so everything that shows them updates
// when a booking is saved and the query is invalidated with this key.
export const MY_BOOKINGS_KEY = ['my-bookings']

export function useMyBookings() {
  return useQuery({ queryKey: MY_BOOKINGS_KEY, queryFn: getMyBookings })
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  canCancelBooking,
  getMyBookings,
  isCancellable,
  isMyBooking,
  removeMyBooking,
  saveMyBooking,
  upcomingBookings,
  type MyBooking,
} from '@/lib/myBookings'
import { makeSlot } from '@/test/factories'

const STORAGE_KEY = 'smileslot-my-bookings'
const NOW = new Date('2026-07-15T10:00:00Z')

beforeEach(() => {
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function hoursFromNow(hours: number): string {
  return new Date(NOW.getTime() + hours * 60 * 60 * 1000).toISOString()
}

function makeBooking(overrides: Partial<MyBooking> = {}): MyBooking {
  return {
    slot_id: 1,
    start_at: hoursFromNow(48),
    duration_minutes: 30,
    doctor_name: 'Dr. Test',
    service_name: 'Cleaning',
    patient_name: 'Ana',
    booking_id: 10,
    cancel_token: 'secret',
    ...overrides,
  }
}

describe('saving and reading', () => {
  it('saves bookings one after another and removes one by id', () => {
    saveMyBooking(makeBooking({ booking_id: 10 }))
    saveMyBooking(makeBooking({ booking_id: 11 }))
    expect(getMyBookings().map((b) => b.booking_id)).toEqual([10, 11])

    removeMyBooking(10)
    expect(getMyBookings().map((b) => b.booking_id)).toEqual([11])
  })

  it('returns an empty list when nothing is saved', () => {
    expect(getMyBookings()).toEqual([])
  })

  it('returns an empty list when the saved text is corrupted', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(getMyBookings()).toEqual([])
  })

  it('returns an empty list when the saved JSON is not a list', () => {
    localStorage.setItem(STORAGE_KEY, '{"slot_id": 1}')
    expect(getMyBookings()).toEqual([])
  })

  it('does not crash when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(getMyBookings()).toEqual([])
    expect(() => saveMyBooking(makeBooking())).not.toThrow()
    expect(() => removeMyBooking(10)).not.toThrow()
  })
})

describe('the 24-hour cancel rule', () => {
  it('allows cancelling with more than 24 hours left, and with exactly 24', () => {
    expect(canCancelBooking(makeBooking({ start_at: hoursFromNow(25) }))).toBe(true)
    expect(canCancelBooking(makeBooking({ start_at: hoursFromNow(24) }))).toBe(true)
  })

  it('does not allow it with less than 24 hours left, or after the start', () => {
    expect(canCancelBooking(makeBooking({ start_at: hoursFromNow(23.99) }))).toBe(false)
    expect(canCancelBooking(makeBooking({ start_at: hoursFromNow(-1) }))).toBe(false)
  })

  it('can only cancel bookings that have an id and a token', () => {
    expect(isCancellable(makeBooking())).toBe(true)
    expect(isCancellable(makeBooking({ cancel_token: undefined }))).toBe(false) // saved before cancelling existed
    expect(isCancellable(makeBooking({ booking_id: undefined }))).toBe(false)
  })
})

describe('recognising my bookings', () => {
  const booked = makeSlot({ id: 1, status: 'booked', start_at: '2026-07-20T08:00:00Z' })

  it('needs the same slot id and the same start time', () => {
    expect(isMyBooking(booked, [makeBooking({ slot_id: 1, start_at: '2026-07-20T08:00:00Z' })])).toBe(true)
    // Same id but another start time: the id was reused after the database was reseeded.
    expect(isMyBooking(booked, [makeBooking({ slot_id: 1, start_at: '2026-07-21T08:00:00Z' })])).toBe(false)
    expect(isMyBooking(booked, [makeBooking({ slot_id: 2, start_at: '2026-07-20T08:00:00Z' })])).toBe(false)
  })

  it('only counts slots that are booked', () => {
    const free = makeSlot({ id: 1, status: 'available', start_at: '2026-07-20T08:00:00Z' })
    expect(isMyBooking(free, [makeBooking({ slot_id: 1, start_at: '2026-07-20T08:00:00Z' })])).toBe(false)
  })

  it('lists upcoming bookings, soonest first, without the past ones', () => {
    const later = makeBooking({ booking_id: 1, start_at: hoursFromNow(72) })
    const sooner = makeBooking({ booking_id: 2, start_at: hoursFromNow(5) })
    const past = makeBooking({ booking_id: 3, start_at: hoursFromNow(-5) })

    expect(upcomingBookings([later, past, sooner]).map((b) => b.booking_id)).toEqual([2, 1])
  })
})

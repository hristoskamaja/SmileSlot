import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeSlot } from '@/test/factories'
import {
  currentWeekStart,
  dayKey,
  formatSlotDate,
  formatTime,
  formatTimeRange,
  formatWeekRange,
  isPast,
  isPastDay,
  minutesFromDayStart,
  slotDay,
  slotTitle,
  todayInClinic,
  weekDays,
} from '@/lib/slots'

const SUMMER = '2026-07-15T06:30:00Z' // Skopje is UTC+2 in summer: 08:30
const WINTER = '2026-12-01T07:30:00Z' // and UTC+1 in winter: 08:30

beforeEach(() => {
  vi.setSystemTime(new Date('2026-07-15T10:00:00Z')) // a Wednesday
})

afterEach(() => {
  vi.useRealTimers()
})

// vite.config.ts runs the tests in Los Angeles time. If that setting stopped working, the tests below
// would pass for the wrong reason, so check it first.
it('runs in a time zone that is not the clinic time zone', () => {
  expect(new Date(SUMMER).getHours()).toBe(23) // 06:30 UTC is 23:30 the day before in Los Angeles
})

describe('clinic time', () => {
  it('shows summer and winter time correctly', () => {
    expect(formatTime(SUMMER)).toBe('08:30')
    expect(formatTime(WINTER)).toBe('08:30')
  })

  it('puts a late evening UTC slot on the next clinic day', () => {
    expect(slotDay('2026-07-15T22:30:00Z')).toBe('2026-07-16')
    expect(formatTime('2026-07-15T22:30:00Z')).toBe('00:30')
  })

  it('formats the date and the time range', () => {
    expect(formatSlotDate(SUMMER)).toBe('Wed, Jul 15')
    expect(formatTimeRange(makeSlot({ start_at: SUMMER, duration_minutes: 45 }))).toBe('08:30 – 09:15')
  })

  it('counts minutes from the top of the grid (08:00)', () => {
    expect(minutesFromDayStart(makeSlot({ start_at: SUMMER }))).toBe(30)
    expect(minutesFromDayStart(makeSlot({ start_at: '2026-07-15T07:15:00Z' }))).toBe(75) // 09:15
  })

  it('knows today in the clinic, even when it is still yesterday in UTC', () => {
    vi.setSystemTime(new Date('2026-07-15T22:30:00Z')) // already 00:30 on the 16th in Skopje
    expect(todayInClinic()).toBe('2026-07-16')
  })
})

describe('past and weeks', () => {
  it('knows which slots are in the past', () => {
    expect(isPast(makeSlot({ start_at: '2026-07-15T09:00:00Z' }))).toBe(true)
    expect(isPast(makeSlot({ start_at: '2026-07-15T11:00:00Z' }))).toBe(false)
  })

  it('knows which days are in the past (today is not)', () => {
    expect(isPastDay(new Date(2026, 6, 14))).toBe(true)
    expect(isPastDay(new Date(2026, 6, 15))).toBe(false)
    expect(isPastDay(new Date(2026, 6, 16))).toBe(false)
  })

  it('starts the week on Monday, also when today is a Sunday', () => {
    expect(dayKey(currentWeekStart())).toBe('2026-07-13')
    vi.setSystemTime(new Date('2026-07-19T10:00:00Z')) // Sunday
    expect(dayKey(currentWeekStart())).toBe('2026-07-13')
  })

  it('shows Monday to Saturday', () => {
    expect(weekDays(new Date(2026, 6, 13)).map(dayKey)).toEqual([
      '2026-07-13',
      '2026-07-14',
      '2026-07-15',
      '2026-07-16',
      '2026-07-17',
      '2026-07-18',
    ])
  })

  it('formats the week range, also across two months', () => {
    expect(formatWeekRange(new Date(2026, 6, 13))).toBe('Jul 13 – 18, 2026')
    expect(formatWeekRange(new Date(2026, 5, 29))).toBe('Jun 29 – Jul 4, 2026')
  })
})

describe('slotTitle', () => {
  const title = (overrides: Parameters<typeof makeSlot>[0], clinic = false, mine = false) =>
    slotTitle(makeSlot(overrides), 'Cleaning', clinic, mine)

  it('is the service for a free slot', () => {
    expect(title({})).toBe('Cleaning')
  })

  it('hides the patient from the public and shows them to the clinic', () => {
    expect(title({ status: 'booked', patient_name: 'Ana' })).toBe('Booked')
    expect(title({ status: 'booked', patient_name: 'Ana' }, true)).toBe('Ana')
    expect(title({ status: 'booked', patient_name: null }, true)).toBe('Booked')
  })

  it('says "Your booking" for my own booking and "Doctor busy" for a busy slot', () => {
    expect(title({ status: 'booked' }, false, true)).toBe('Your booking')
    expect(title({ status: 'calendar_busy' })).toBe('Doctor busy')
  })
})

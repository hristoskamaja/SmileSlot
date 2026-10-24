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
  nowLinePosition,
  shortSlotTitle,
  shouldStartNextWeek,
  slotDay,
  slotTitle,
  slotTooltip,
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

describe('the "current time" line', () => {
  it('has no position before 08:00 or from 18:00 on', () => {
    expect(nowLinePosition(new Date('2026-07-15T05:59:00Z'))).toBeNull() // 07:59 in Skopje
    expect(nowLinePosition(new Date('2026-07-15T16:00:00Z'))).toBeNull() // 18:00
    expect(nowLinePosition(new Date('2026-07-15T20:00:00Z'))).toBeNull() // 22:00
  })

  it('counts minutes from the top of the grid, on the hour and in between', () => {
    expect(nowLinePosition(new Date('2026-07-15T06:00:00Z'))).toBe(0) // 08:00, the first moment shown
    expect(nowLinePosition(new Date('2026-07-15T08:00:00Z'))).toBe(120) // 10:00
    expect(nowLinePosition(new Date('2026-07-15T08:37:00Z'))).toBe(157) // 10:37
    expect(nowLinePosition(new Date('2026-07-15T15:59:00Z'))).toBe(599) // 17:59, the last minute shown
  })

  it('is the same for a slot and for "now", so the line lines up with the blocks', () => {
    const slot = makeSlot({ start_at: '2026-07-15T08:37:00Z' })
    expect(nowLinePosition(new Date(slot.start_at))).toBe(minutesFromDayStart(slot))
  })

  it('stays right on both sides of the daylight saving changes', () => {
    // The clocks go back on 25 Oct 2026 (03:00 -> 02:00): 10:00 is 08:00 UTC before, 09:00 UTC after.
    expect(nowLinePosition(new Date('2026-10-24T08:00:00Z'))).toBe(120)
    expect(nowLinePosition(new Date('2026-10-25T09:00:00Z'))).toBe(120)
    // And forward on 29 Mar 2026 (02:00 -> 03:00): 10:00 is 09:00 UTC before, 08:00 UTC after.
    expect(nowLinePosition(new Date('2026-03-28T09:00:00Z'))).toBe(120)
    expect(nowLinePosition(new Date('2026-03-29T08:00:00Z'))).toBe(120)
  })
})

describe('which week to open first', () => {
  const future = makeSlot({ start_at: '2026-07-16T08:00:00Z' })
  const past = makeSlot({ start_at: '2026-07-14T08:00:00Z' })

  it('stays on this week when it still has a future slot', () => {
    expect(shouldStartNextWeek([past, future])).toBe(false)
  })

  it('moves to next week when this week has only past slots, or none', () => {
    expect(shouldStartNextWeek([past])).toBe(true)
    expect(shouldStartNextWeek([])).toBe(true)
  })

  it('moves to next week on a Sunday, even if this week has a future slot', () => {
    vi.setSystemTime(new Date('2026-07-19T10:00:00Z'))
    expect(shouldStartNextWeek([makeSlot({ start_at: '2026-07-20T08:00:00Z' })])).toBe(true)
  })

  it('uses clinic time for Sunday: late Saturday in UTC is already Sunday in Skopje', () => {
    vi.setSystemTime(new Date('2026-07-18T22:30:00Z')) // 00:30 on Sunday in Skopje
    expect(shouldStartNextWeek([makeSlot({ start_at: '2026-07-20T08:00:00Z' })])).toBe(true)

    vi.setSystemTime(new Date('2026-07-18T12:00:00Z')) // still Saturday afternoon in Skopje
    expect(shouldStartNextWeek([makeSlot({ start_at: '2026-07-20T08:00:00Z' })])).toBe(false)
  })
})

describe('shortSlotTitle (for blocks too short for two lines)', () => {
  const title = (overrides: Parameters<typeof makeSlot>[0], clinic = false, mine = false) =>
    shortSlotTitle(makeSlot(overrides), 'Cleaning', clinic, mine)

  it('keeps the service name and "Booked", which are short already', () => {
    expect(title({})).toBe('Cleaning')
    expect(title({ status: 'booked', patient_name: 'Ana Petrova' })).toBe('Booked')
  })

  it('shortens "Doctor busy" to "Busy" and "Your booking" to "Yours"', () => {
    expect(title({ status: 'calendar_busy' })).toBe('Busy')
    expect(title({ status: 'booked' }, false, true)).toBe('Yours')
  })

  it('shows only the first name of the patient in the clinic', () => {
    expect(title({ status: 'booked', patient_name: 'Ivana Trajkovska' }, true)).toBe('Ivana')
    expect(title({ status: 'booked', patient_name: null }, true)).toBe('Booked')
  })
})

describe('slotTooltip', () => {
  const slot = makeSlot({ start_at: SUMMER, duration_minutes: 45 })

  it('has the service and the full time range', () => {
    expect(slotTooltip(slot, 'Cleaning', false)).toBe('Cleaning · 08:30 – 09:15')
  })

  it('adds the full patient name for the clinic, but never for the public', () => {
    const booked = { ...slot, status: 'booked' as const, patient_name: 'Ana Petrova' }
    expect(slotTooltip(booked, 'Cleaning', true)).toBe('Ana Petrova · Cleaning · 08:30 – 09:15')
    expect(slotTooltip(booked, 'Cleaning', false)).toBe('Cleaning · 08:30 – 09:15')
  })

  it('says why a busy slot cannot be booked', () => {
    const busy = { ...slot, status: 'calendar_busy' as const }
    expect(slotTooltip(busy, 'Cleaning', false)).toBe('Cleaning · 08:30 – 09:15 · Doctor is busy (Google Calendar)')
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

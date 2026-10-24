import type { CSSProperties } from 'react'
import { addDays, format, startOfWeek } from 'date-fns'
import type { Slot } from '@/types'

// The calendar always shows clinic time, whatever the browser's time zone is.
const CLINIC_TIMEZONE = 'Europe/Skopje'

export const DAY_START_HOUR = 8
export const DAY_END_HOUR = 18
export const HOUR_HEIGHT = 80 // pixels per hour in the weekly grid

// The colors live in index.css as CSS variables, e.g. --service-checkup-bg.
// This maps a service name to the part of the variable name after "--service-".
const SERVICE_KEYS: Record<string, string> = {
  'Check-up': 'checkup',
  Cleaning: 'cleaning',
  Filling: 'filling',
  Whitening: 'whitening',
}

// Slot blocks and the legend both call this, so they always share the same colors.
export function serviceStyle(serviceName: string): CSSProperties {
  const key = SERVICE_KEYS[serviceName]
  if (!key) return { backgroundColor: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' } // unknown service
  return {
    backgroundColor: `var(--service-${key}-bg)`,
    borderColor: `var(--service-${key}-border)`,
    color: `var(--service-${key}-text)`,
  }
}

// Colors of a slot where the doctor is busy in Google Calendar (variables from index.css).
export const busyStyle: CSSProperties = {
  backgroundColor: 'var(--busy-bg)',
  borderColor: 'var(--busy-border)',
  color: 'var(--busy-text)',
}

const BUSY_TOOLTIP = 'Doctor is busy (Google Calendar)'

// Splits a timestamp into its clinic-time parts, e.g. { date: "2026-10-19", hour: 8, minute: 30 }.
function clinicParts(iso: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find((part) => part.type === type)!.value
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  }
}

// "2026-10-19" in clinic time, used to put a slot into the right day column.
export function slotDay(iso: string): string {
  return clinicParts(iso).date
}

export function formatTime(iso: string): string {
  const { hour, minute } = clinicParts(iso)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// "Thu, Oct 22", in clinic time.
export function formatSlotDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso))
}

export function formatTimeRange(slot: Slot): string {
  const endIso = new Date(new Date(slot.start_at).getTime() + slot.duration_minutes * 60_000).toISOString()
  return `${formatTime(slot.start_at)} – ${formatTime(endIso)}`
}

// Is this whole day before today? (Today and later days are not.) Both sides are clinic-time dates.
export function isPastDay(day: Date): boolean {
  return dayKey(day) < todayInClinic()
}

// The main text of a slot block: the service, or who booked it.
export function slotTitle(slot: Slot, serviceName: string, clinic: boolean, mine: boolean): string {
  if (mine) return 'Your booking'
  if (slot.status === 'calendar_busy') return 'Doctor busy'
  if (slot.status !== 'booked') return serviceName
  return clinic ? (slot.patient_name ?? 'Booked') : 'Booked'
}

// The title of a block that is too short for two lines. It has to fit next to the start time and an
// icon, so it is shorter than slotTitle: "Busy", "Yours", and the patient's first name in the clinic.
export function shortSlotTitle(slot: Slot, serviceName: string, clinic: boolean, mine: boolean): string {
  if (mine) return 'Yours'
  if (slot.status === 'calendar_busy') return 'Busy'
  const title = slotTitle(slot, serviceName, clinic, mine)
  return clinic && slot.status === 'booked' ? title.split(' ')[0] : title
}

// The hover text of a slot block: service and full time range. The clinic also sees who booked it,
// and a busy slot says why it cannot be booked.
export function slotTooltip(slot: Slot, serviceName: string, clinic: boolean): string {
  const parts = [serviceName, formatTimeRange(slot)]
  if (clinic && slot.status === 'booked' && slot.patient_name) parts.unshift(slot.patient_name)
  if (slot.status === 'calendar_busy') parts.push(BUSY_TOOLTIP)
  return parts.join(' · ')
}

export function isPast(slot: Slot): boolean {
  return new Date(slot.start_at) < new Date()
}

// Minutes since the top of the grid (08:00), used to position a time vertically.
function minutesFromDayStartAt(iso: string): number {
  const { hour, minute } = clinicParts(iso)
  return (hour - DAY_START_HOUR) * 60 + minute
}

// The same for a slot: used to position its block.
export function minutesFromDayStart(slot: Slot): number {
  return minutesFromDayStartAt(slot.start_at)
}

// Where the "current time" line goes: minutes from the top of the grid, or null when it is
// before 08:00 or from 18:00 on, because then the time is not in the grid.
export function nowLinePosition(now: Date): number | null {
  const minutes = minutesFromDayStartAt(now.toISOString())
  return minutes >= 0 && minutes < (DAY_END_HOUR - DAY_START_HOUR) * 60 ? minutes : null
}

// Today's date in clinic time, as "2026-10-19".
export function todayInClinic(): string {
  return clinicParts(new Date().toISOString()).date
}

// The Monday of the week that contains today (in clinic time).
export function currentWeekStart(): Date {
  const [year, month, day] = todayInClinic().split('-').map(Number)
  return startOfWeek(new Date(year, month - 1, day), { weekStartsOn: 1 })
}

// Should the page open next week instead of this one? Yes on a Sunday (the clinic is closed and the
// grid has no Sunday), or when nothing is left to book this week. "Sunday" is in clinic time.
export function shouldStartNextWeek(thisWeekSlots: Slot[]): boolean {
  const [year, month, day] = todayInClinic().split('-').map(Number)
  const isSunday = new Date(year, month - 1, day).getDay() === 0
  return isSunday || !thisWeekSlots.some((slot) => !isPast(slot))
}

// Monday to Saturday, the days the grid shows.
export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))
}

export function dayKey(day: Date): string {
  return format(day, 'yyyy-MM-dd')
}

// "Oct 19 – 24, 2026", or "Oct 26 – Nov 1, 2026" when the week crosses a month.
export function formatWeekRange(weekStart: Date): string {
  const first = weekStart
  const last = addDays(weekStart, 5)
  if (first.getMonth() === last.getMonth()) {
    return `${format(first, 'MMM d')} – ${format(last, 'd, yyyy')}`
  }
  return `${format(first, 'MMM d')} – ${format(last, 'MMM d, yyyy')}`
}

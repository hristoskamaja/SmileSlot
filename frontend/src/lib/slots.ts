import { addDays, format, startOfWeek } from 'date-fns'
import type { Slot } from '@/types'

// The calendar always shows clinic time, whatever the browser's time zone is.
const CLINIC_TIMEZONE = 'Europe/Skopje'

export const DAY_START_HOUR = 8
export const DAY_END_HOUR = 18
export const HOUR_HEIGHT = 80 // pixels per hour in the weekly grid

// Tailwind needs complete class names in the source, so each service gets its full set here.
const SERVICE_COLORS: Record<string, string> = {
  'Check-up': 'bg-sky-100 border-sky-300 text-sky-900',
  Cleaning: 'bg-emerald-100 border-emerald-300 text-emerald-900',
  Filling: 'bg-orange-100 border-orange-300 text-orange-900',
  Whitening: 'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-900',
}
const DEFAULT_COLOR = 'bg-slate-100 border-slate-300 text-slate-900'

export function serviceColor(serviceName: string): string {
  return SERVICE_COLORS[serviceName] ?? DEFAULT_COLOR
}

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

export function formatTimeRange(slot: Slot): string {
  const endIso = new Date(new Date(slot.start_at).getTime() + slot.duration_minutes * 60_000).toISOString()
  return `${formatTime(slot.start_at)} – ${formatTime(endIso)}`
}

export function isPast(slot: Slot): boolean {
  return new Date(slot.start_at) < new Date()
}

// Minutes since the top of the grid (08:00), used to position a slot vertically.
export function minutesFromDayStart(slot: Slot): number {
  const { hour, minute } = clinicParts(slot.start_at)
  return (hour - DAY_START_HOUR) * 60 + minute
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

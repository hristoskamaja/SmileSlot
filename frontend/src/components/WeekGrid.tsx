import { useEffect, useRef } from 'react'
import { format } from 'date-fns'
import SlotBlock from '@/components/SlotBlock'
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  HOUR_HEIGHT,
  dayKey,
  isPastDay,
  minutesFromDayStart,
  nowLinePosition,
  slotDay,
  todayInClinic,
} from '@/lib/slots'
import { cn } from '@/lib/utils'
import { useNow } from '@/lib/useNow'
import type { Service, Slot } from '@/types'

type Props = {
  days: Date[]
  slots: Slot[]
  services: Service[]
  mode: 'book' | 'clinic'
  isMine?: (slot: Slot) => boolean // book page only: is this booked slot the user's own?
  onSelect: (slot: Slot) => void
}

const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i)
const GRID_COLUMNS = 'grid grid-cols-[72px_repeat(6,minmax(0,1fr))]'

// A fixed height, whatever the window size: about 8 of the 10 hours are visible, the rest scrolls inside the grid.
// A small window just scrolls the page below it.
const GRID_HEIGHT = 760

function WeekGrid({ days, slots, services, mode, isMine, onSelect }: Props) {
  const now = useNow() // re-renders every minute, which moves the "current time" line
  const today = todayInClinic()
  const nowMinutes = nowLinePosition(now) // null outside 08:00-18:00
  const scrollRef = useRef<HTMLDivElement>(null)

  // When a week shows up, scroll to its earliest slot. It depends on the week and that time only,
  // so a refetch after booking or deleting does not move the grid under the user's hands.
  const weekKey = dayKey(days[0])
  const earliest = slots.length > 0 ? Math.min(...slots.map(minutesFromDayStart)) : null
  useEffect(() => {
    if (earliest === null || !scrollRef.current) return
    // 16px less than the slot's position, so it sits just below the sticky day names.
    scrollRef.current.scrollTop = Math.max(0, (earliest / 60) * HOUR_HEIGHT - 16)
  }, [weekKey, earliest])

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* The grid scrolls inside this box; the day names stay visible at the top. */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ height: GRID_HEIGHT }}>
        <div className={cn(GRID_COLUMNS, 'sticky top-0 z-10 border-b bg-card')}>
          <div />
          {days.map((day) => {
            const isToday = dayKey(day) === today
            const pastDay = isPastDay(day) // muted header; today keeps its teal highlight
            return (
              <div
                key={dayKey(day)}
                className={cn('border-l py-3 text-center', isToday && 'bg-primary/10', pastDay && 'bg-muted/70')}
              >
                <div className={cn('text-sm font-medium uppercase text-muted-foreground', pastDay && 'opacity-60')}>
                  {format(day, 'EEE')}
                </div>
                <div
                  className={cn(
                    'mx-auto mt-1 flex size-11 items-center justify-center rounded-full text-xl font-semibold',
                    isToday && 'bg-primary text-primary-foreground',
                    pastDay && 'text-muted-foreground opacity-60',
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            )
          })}
        </div>

        <div className={GRID_COLUMNS}>
          <div>
            {HOURS.map((hour) => (
              <div key={hour} className="relative" style={{ height: HOUR_HEIGHT }}>
                <span className="absolute -top-2.5 right-3 text-sm text-muted-foreground">
                  {hour === DAY_START_HOUR ? '' : `${String(hour).padStart(2, '0')}:00`}
                </span>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const daySlots = slots.filter((slot) => slotDay(slot.start_at) === dayKey(day))
            return (
              <div
                key={dayKey(day)}
                className={cn('relative border-l', dayKey(day) === today && 'bg-primary/5', isPastDay(day) && 'bg-muted/70')}
                style={{ height: HOURS.length * HOUR_HEIGHT }}
              >
                {HOURS.map((hour) => (
                  <div key={hour} className="relative border-b border-dashed" style={{ height: HOUR_HEIGHT }}>
                    {/* The half hour: a fainter line than the one for the full hour. */}
                    <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border/60" aria-hidden />
                  </div>
                ))}
                {daySlots.map((slot) => (
                  <SlotBlock
                    key={slot.id}
                    slot={slot}
                    mode={mode}
                    mine={isMine?.(slot) ?? false}
                    onSelect={onSelect}
                    serviceName={services.find((s) => s.id === slot.service_id)?.name ?? 'Appointment'}
                    style={{
                      top: (minutesFromDayStart(slot) / 60) * HOUR_HEIGHT,
                      height: (slot.duration_minutes / 60) * HOUR_HEIGHT - 2,
                    }}
                  />
                ))}
                {/* The current time, only in today's column (so only when this week is the current one).
                    Drawn after the blocks, so it is above them, and it lets clicks through. */}
                {dayKey(day) === today && nowMinutes !== null && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-[5] h-0.5 -translate-y-1/2 bg-primary"
                    style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
                    aria-hidden
                  >
                    <span className="absolute top-1/2 -left-1 size-2.5 -translate-y-1/2 rounded-full bg-primary" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default WeekGrid

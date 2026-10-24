import { format } from 'date-fns'
import SlotBlock from '@/components/SlotBlock'
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  HOUR_HEIGHT,
  dayKey,
  isPastDay,
  minutesFromDayStart,
  slotDay,
  todayInClinic,
} from '@/lib/slots'
import { cn } from '@/lib/utils'
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

function WeekGrid({ days, slots, services, mode, isMine, onSelect }: Props) {
  const today = todayInClinic()

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* The grid scrolls inside this box; the day names stay visible at the top. */}
      <div className="max-h-[640px] overflow-y-auto">
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
                  <div key={hour} className="border-b border-dashed" style={{ height: HOUR_HEIGHT }} />
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
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default WeekGrid

import { format } from 'date-fns'
import { Calendar, CircleCheck, Lock, Trash2 } from 'lucide-react'
import {
  BUSY_TOOLTIP,
  busyStyle,
  dayKey,
  formatTime,
  formatTimeRange,
  isPast,
  isPastDay,
  serviceStyle,
  slotDay,
  slotTitle,
} from '@/lib/slots'
import { cn } from '@/lib/utils'
import type { Service, Slot } from '@/types'

type Props = {
  days: Date[]
  slots: Slot[]
  services: Service[]
  mode: 'book' | 'clinic' // clinic shows patient names and a delete icon
  isMine?: (slot: Slot) => boolean // book page only: is this booked slot the user's own?
  onSelect: (slot: Slot) => void
}

// Mobile view: one section per day, listing only the days that have slots.
function DayList({ days, slots, services, mode, isMine, onSelect }: Props) {
  const clinic = mode === 'clinic'

  return (
    <div className="space-y-6">
      {days.map((day) => {
        const daySlots = slots.filter((slot) => slotDay(slot.start_at) === dayKey(day))
        if (daySlots.length === 0) return null
        return (
          <section key={dayKey(day)}>
            <h2 className={cn('mb-2 font-semibold', isPastDay(day) && 'text-muted-foreground/60')}>
              {format(day, 'EEEE, MMM d')}
            </h2>
            <ul className="space-y-2">
              {daySlots.map((slot) => {
                const booked = slot.status === 'booked'
                const busy = slot.status === 'calendar_busy'
                const mine = isMine?.(slot) ?? false
                const past = isPast(slot)
                const canDelete = clinic && !booked && !past
                // Patients cannot click booked or busy slots. In the clinic they stay clickable: a booked slot
                // opens its details, a busy one can be deleted. Past slots are never clickable.
                const disabled = past || (!clinic && (booked || busy))
                const canView = clinic && booked && !past
                const serviceName = services.find((s) => s.id === slot.service_id)?.name ?? 'Appointment'
                const title = slotTitle(slot, serviceName, clinic, mine)
                const timeLine = clinic && booked ? `${serviceName} · ${formatTimeRange(slot)}` : formatTimeRange(slot)
                const BookedIcon = mine ? CircleCheck : Lock
                return (
                  <li key={slot.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelect(slot)}
                      title={busy ? BUSY_TOOLTIP : undefined}
                      aria-label={
                        canDelete
                          ? `Delete ${serviceName} slot at ${formatTime(slot.start_at)}`
                          : canView
                            ? `View booking of ${slot.patient_name} at ${formatTime(slot.start_at)}`
                            : undefined
                      }
                      style={booked ? undefined : busy ? busyStyle : serviceStyle(serviceName)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left outline-none',
                        'focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default',
                        booked && (mine ? 'my-booking' : 'booked-stripes'),
                        past && 'opacity-50',
                      )}
                    >
                      <span className="flex items-center gap-1.5 font-semibold">
                        {booked && <BookedIcon className="size-4" aria-hidden />}
                        {busy && <Calendar className="size-4" aria-hidden />}
                        {title}
                      </span>
                      <span className="flex items-center gap-2 text-sm">
                        {timeLine}
                        {canDelete && <Trash2 className="size-4 opacity-60" aria-hidden />}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

export default DayList

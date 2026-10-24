import { format } from 'date-fns'
import { Lock, Trash2 } from 'lucide-react'
import { dayKey, formatTime, formatTimeRange, isPast, serviceStyle, slotDay } from '@/lib/slots'
import { cn } from '@/lib/utils'
import type { Service, Slot } from '@/types'

type Props = {
  days: Date[]
  slots: Slot[]
  services: Service[]
  mode: 'book' | 'clinic' // clinic shows patient names and a delete icon
  onSelect: (slot: Slot) => void
}

// Mobile view: one section per day, listing only the days that have slots.
function DayList({ days, slots, services, mode, onSelect }: Props) {
  const clinic = mode === 'clinic'

  return (
    <div className="space-y-6">
      {days.map((day) => {
        const daySlots = slots.filter((slot) => slotDay(slot.start_at) === dayKey(day))
        if (daySlots.length === 0) return null
        return (
          <section key={dayKey(day)}>
            <h2 className="mb-2 font-semibold">{format(day, 'EEEE, MMM d')}</h2>
            <ul className="space-y-2">
              {daySlots.map((slot) => {
                const booked = slot.status === 'booked'
                const past = isPast(slot)
                const canDelete = clinic && !booked && !past
                const serviceName = services.find((s) => s.id === slot.service_id)?.name ?? 'Appointment'
                const title = booked ? (clinic ? (slot.patient_name ?? 'Booked') : 'Booked') : serviceName
                const timeLine = clinic && booked ? `${serviceName} · ${formatTimeRange(slot)}` : formatTimeRange(slot)
                return (
                  <li key={slot.id}>
                    <button
                      type="button"
                      disabled={booked || past}
                      onClick={() => onSelect(slot)}
                      aria-label={canDelete ? `Delete ${serviceName} slot at ${formatTime(slot.start_at)}` : undefined}
                      style={booked ? undefined : serviceStyle(serviceName)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left outline-none',
                        'focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default',
                        booked && 'booked-stripes',
                        past && 'opacity-50',
                      )}
                    >
                      <span className="flex items-center gap-1.5 font-semibold">
                        {booked && <Lock className="size-4" aria-hidden />}
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

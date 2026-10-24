import { format } from 'date-fns'
import { Lock } from 'lucide-react'
import { dayKey, formatTimeRange, isPast, serviceStyle, slotDay } from '@/lib/slots'
import { cn } from '@/lib/utils'
import type { Service, Slot } from '@/types'

type Props = {
  days: Date[]
  slots: Slot[]
  services: Service[]
}

// Mobile view: one section per day, listing only the days that have slots.
function DayList({ days, slots, services }: Props) {
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
                const serviceName = services.find((s) => s.id === slot.service_id)?.name ?? 'Appointment'
                return (
                  <li
                    key={slot.id}
                    style={booked ? undefined : serviceStyle(serviceName)}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg border px-4 py-3',
                      booked && 'booked-stripes',
                      isPast(slot) && 'opacity-50',
                    )}
                  >
                    <span className="flex items-center gap-1.5 font-semibold">
                      {booked && <Lock className="size-4" aria-hidden />}
                      {booked ? 'Booked' : serviceName}
                    </span>
                    <span className="text-sm">{formatTimeRange(slot)}</span>
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

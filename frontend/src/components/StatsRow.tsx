import type { ReactNode } from 'react'
import { CalendarDays, CircleCheck, Sparkles } from 'lucide-react'
import type { Slot } from '@/types'

type Props = {
  slots: Slot[] | undefined // undefined while loading
}

function StatCard({ icon, value, label }: { icon: ReactNode; value: number | undefined; label: string }) {
  return (
    <div className="flex items-center gap-5 rounded-2xl border bg-card p-6 shadow-sm">
      <span
        className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-primary"
        style={{ backgroundColor: 'var(--message-bg)' }}
        aria-hidden
      >
        {icon}
      </span>
      <div>
        <div className="text-3xl font-bold leading-none">{value ?? '–'}</div>
        <div className="mt-1.5 text-lg text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

function StatsRow({ slots }: Props) {
  const booked = slots?.filter((slot) => slot.status === 'booked').length
  const available = slots?.filter((slot) => slot.status === 'available').length

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard icon={<CalendarDays className="size-6" />} value={slots?.length} label="Slots this week" />
      <StatCard icon={<CircleCheck className="size-6" />} value={booked} label="Booked" />
      <StatCard icon={<Sparkles className="size-6" />} value={available} label="Available" />
    </div>
  )
}

export default StatsRow

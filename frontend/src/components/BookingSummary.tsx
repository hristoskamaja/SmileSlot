import type { ReactNode } from 'react'
import { Calendar, Clock, Heart, Stethoscope, Timer } from 'lucide-react'
import { formatSlotDate, formatTime } from '@/lib/slots'
import type { Doctor, Slot } from '@/types'

type Props = {
  slot: Slot
  doctor: Doctor
  serviceName: string
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-right text-base font-semibold">{children}</span>
    </div>
  )
}

// The mint card with the appointment details, shown in the form and in the confirmation.
function BookingSummary({ slot, doctor, serviceName }: Props) {
  return (
    <div
      className="grid gap-x-8 gap-y-3 rounded-2xl border p-5 sm:grid-cols-2"
      style={{ backgroundColor: 'var(--summary-bg)', borderColor: 'var(--summary-border)' }}
    >
      <Row icon={<Stethoscope className="size-5" aria-hidden />} label="Doctor">
        {doctor.name}
      </Row>
      <Row icon={<Heart className="size-5" aria-hidden />} label="Service">
        {serviceName}
      </Row>
      <Row icon={<Calendar className="size-5" aria-hidden />} label="Date">
        {formatSlotDate(slot.start_at)}
      </Row>
      <Row icon={<Clock className="size-5" aria-hidden />} label="Time">
        {formatTime(slot.start_at)}
      </Row>
      <Row icon={<Timer className="size-5" aria-hidden />} label="Duration">
        {slot.duration_minutes} min
      </Row>
    </div>
  )
}

export default BookingSummary

import type { CSSProperties } from 'react'
import { Calendar, CircleCheck, Lock, Trash2 } from 'lucide-react'
import { BUSY_TOOLTIP, busyStyle, formatTime, formatTimeRange, isPast, serviceStyle, slotTitle } from '@/lib/slots'
import { cn } from '@/lib/utils'
import type { Slot } from '@/types'

type Props = {
  slot: Slot
  serviceName: string
  style: CSSProperties // top and height, set by the grid
  mode: 'book' | 'clinic' // clinic shows patient names and a delete icon
  mine: boolean // a booked slot that this browser booked (book mode only)
  onSelect: (slot: Slot) => void
}

// Slots shorter than this are too small to fit a second line with the time.
const MIN_MINUTES_FOR_TIME = 45

function SlotBlock({ slot, serviceName, style, mode, mine, onSelect }: Props) {
  const booked = slot.status === 'booked'
  const busy = slot.status === 'calendar_busy'
  const past = isPast(slot)
  const showTime = slot.duration_minutes >= MIN_MINUTES_FOR_TIME
  const clinic = mode === 'clinic'
  const canDelete = clinic && !booked && !past
  // Patients cannot book a busy slot; in the clinic it stays clickable so staff can delete it.
  const disabled = booked || past || (busy && !clinic)

  const title = slotTitle(slot, serviceName, clinic, mine)
  // In the clinic view a booked block names the service too, since the title is the patient.
  const timeLine = clinic && booked ? `${serviceName} · ${formatTimeRange(slot)}` : formatTimeRange(slot)
  const BookedIcon = mine ? CircleCheck : Lock

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(slot)}
      title={busy ? BUSY_TOOLTIP : undefined}
      aria-label={canDelete ? `Delete ${serviceName} slot at ${formatTime(slot.start_at)}` : undefined}
      // Booked slots get their colors from a class (.my-booking or .booked-stripes); busy ones from the busy
      // variables; the others from the service.
      style={{ ...style, ...(booked ? {} : busy ? busyStyle : serviceStyle(serviceName)) }}
      className={cn(
        'absolute inset-x-2 flex flex-col justify-start overflow-hidden rounded-lg border px-3 py-1 text-left text-sm outline-none',
        'focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default',
        booked && (mine ? 'my-booking' : 'booked-stripes'),
        past && 'opacity-50',
      )}
    >
      <span className="flex items-center gap-1.5 font-semibold">
        {booked && <BookedIcon className="size-3.5 shrink-0" aria-hidden />}
        {busy && <Calendar className="size-3.5 shrink-0" aria-hidden />}
        <span className="truncate">{title}</span>
        {canDelete && <Trash2 className="ml-auto size-3.5 shrink-0 opacity-60" aria-hidden />}
      </span>
      {showTime && <span className="truncate text-sm opacity-70">{timeLine}</span>}
    </button>
  )
}

export default SlotBlock

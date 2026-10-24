import type { CSSProperties } from 'react'
import { Lock, Trash2 } from 'lucide-react'
import { formatTime, formatTimeRange, isPast, serviceStyle } from '@/lib/slots'
import { cn } from '@/lib/utils'
import type { Slot } from '@/types'

type Props = {
  slot: Slot
  serviceName: string
  style: CSSProperties // top and height, set by the grid
  mode: 'book' | 'clinic' // clinic shows patient names and a delete icon
  onSelect: (slot: Slot) => void
}

// Slots shorter than this are too small to fit a second line with the time.
const MIN_MINUTES_FOR_TIME = 45

function SlotBlock({ slot, serviceName, style, mode, onSelect }: Props) {
  const booked = slot.status === 'booked'
  const past = isPast(slot)
  const showTime = slot.duration_minutes >= MIN_MINUTES_FOR_TIME
  const clinic = mode === 'clinic'
  const canDelete = clinic && !booked && !past

  const title = booked ? (clinic ? (slot.patient_name ?? 'Booked') : 'Booked') : serviceName
  // In the clinic view a booked block names the service too, since the title is the patient.
  const timeLine = clinic && booked ? `${serviceName} · ${formatTimeRange(slot)}` : formatTimeRange(slot)

  return (
    <button
      type="button"
      disabled={booked || past}
      onClick={() => onSelect(slot)}
      aria-label={canDelete ? `Delete ${serviceName} slot at ${formatTime(slot.start_at)}` : undefined}
      // Booked slots get their colors from the .booked-stripes class; the others from the service.
      style={{ ...style, ...(booked ? {} : serviceStyle(serviceName)) }}
      className={cn(
        'absolute inset-x-2 flex flex-col justify-start overflow-hidden rounded-lg border px-3 py-1 text-left text-sm outline-none',
        'focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default',
        booked && 'booked-stripes',
        past && 'opacity-50',
      )}
    >
      <span className="flex items-center gap-1.5 font-semibold">
        {booked && <Lock className="size-3.5 shrink-0" aria-hidden />}
        <span className="truncate">{title}</span>
        {canDelete && <Trash2 className="ml-auto size-3.5 shrink-0 opacity-60" aria-hidden />}
      </span>
      {showTime && <span className="truncate text-sm opacity-70">{timeLine}</span>}
    </button>
  )
}

export default SlotBlock

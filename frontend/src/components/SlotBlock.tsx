import type { CSSProperties } from 'react'
import { Calendar, CircleCheck, Lock, Trash2 } from 'lucide-react'
import {
  busyStyle,
  formatTime,
  formatTimeRange,
  isPast,
  serviceStyle,
  shortSlotTitle,
  slotTitle,
  slotTooltip,
} from '@/lib/slots'
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

// Slots shorter than this are too small for two lines. They show "Title · 09:00" on one line instead.
const MIN_MINUTES_FOR_TWO_LINES = 40

function SlotBlock({ slot, serviceName, style, mode, mine, onSelect }: Props) {
  const booked = slot.status === 'booked'
  const busy = slot.status === 'calendar_busy'
  const past = isPast(slot)
  const twoLines = slot.duration_minutes >= MIN_MINUTES_FOR_TWO_LINES
  const clinic = mode === 'clinic'
  const canDelete = clinic && !booked && !past
  // Patients cannot click booked or busy slots. In the clinic they stay clickable: a booked slot opens
  // its details, a busy one can be deleted. Past slots are never clickable.
  const disabled = past || (!clinic && (booked || busy))
  const canView = clinic && booked && !past

  const title = slotTitle(slot, serviceName, clinic, mine)
  // In the clinic view a booked block names the service too, since the title is the patient.
  const timeLine = clinic && booked ? `${serviceName} · ${formatTimeRange(slot)}` : formatTimeRange(slot)
  const BookedIcon = mine ? CircleCheck : Lock

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(slot)}
      title={slotTooltip(slot, serviceName, clinic)}
      aria-label={
        canDelete
          ? `Delete ${serviceName} slot at ${formatTime(slot.start_at)}`
          : canView
            ? `View booking of ${slot.patient_name} at ${formatTime(slot.start_at)}`
            : undefined
      }
      // Booked slots get their colors from a class (.my-booking or .booked-stripes); busy ones from the busy
      // variables; the others from the service.
      style={{ ...style, ...(booked ? {} : busy ? busyStyle : serviceStyle(serviceName)) }}
      className={cn(
        'absolute inset-x-2 flex flex-col overflow-hidden rounded-lg border text-left text-sm outline-none',
        'focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default',
        // A short block has no room for vertical padding, and less on the sides so its label fits.
        twoLines ? 'justify-start px-3 py-1' : 'justify-center px-2',
        booked && (mine ? 'my-booking' : 'booked-stripes'),
        past && 'opacity-50',
      )}
    >
      <span className="flex items-center gap-1.5 font-semibold">
        {booked && <BookedIcon className="size-3.5 shrink-0" aria-hidden />}
        {busy && <Calendar className="size-3.5 shrink-0" aria-hidden />}
        <span className="truncate">
          {twoLines ? title : `${shortSlotTitle(slot, serviceName, clinic, mine)} · ${formatTime(slot.start_at)}`}
        </span>
        {canDelete && <Trash2 className="ml-auto size-3.5 shrink-0 opacity-60" aria-hidden />}
      </span>
      {twoLines && <span className="truncate text-sm opacity-70">{timeLine}</span>}
    </button>
  )
}

export default SlotBlock

import type { CSSProperties } from 'react'
import { Lock } from 'lucide-react'
import { formatTimeRange, isPast, serviceStyle } from '@/lib/slots'
import { cn } from '@/lib/utils'
import type { Slot } from '@/types'

type Props = {
  slot: Slot
  serviceName: string
  style: CSSProperties // top and height, set by the grid
}

// Slots shorter than this are too small to fit a second line with the time.
const MIN_MINUTES_FOR_TIME = 45

function SlotBlock({ slot, serviceName, style }: Props) {
  const booked = slot.status === 'booked'
  const past = isPast(slot)
  const showTime = slot.duration_minutes >= MIN_MINUTES_FOR_TIME

  return (
    <button
      type="button"
      // Clicking does nothing yet; the booking dialog comes in the next step.
      disabled={booked || past}
      // Booked slots get their colors from the .booked-stripes class; the others from the service.
      style={{ ...style, ...(booked ? {} : serviceStyle(serviceName)) }}
      className={cn(
        'absolute inset-x-2 flex flex-col justify-start overflow-hidden rounded-lg border px-3 py-1 text-left text-sm outline-none',
        'focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default',
        booked && 'booked-stripes',
        past && 'opacity-50',
      )}
    >
      <span className="flex items-center gap-1.5 truncate font-semibold">
        {booked && <Lock className="size-3.5 shrink-0" aria-hidden />}
        {booked ? 'Booked' : serviceName}
      </span>
      {showTime && <span className="truncate text-sm opacity-70">{formatTimeRange(slot)}</span>}
    </button>
  )
}

export default SlotBlock

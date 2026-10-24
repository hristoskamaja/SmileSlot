import type { ReactNode } from 'react'
import { CalendarX, TriangleAlert } from 'lucide-react'
import DayList from '@/components/DayList'
import Legend from '@/components/Legend'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import WeekGrid from '@/components/WeekGrid'
import type { Service, Slot } from '@/types'

type Props = {
  slots: Slot[] | undefined
  services: Service[] | undefined
  days: Date[]
  loading: boolean
  error: Error | null
  onRetry: () => void
  mode: 'book' | 'clinic'
  onSelect: (slot: Slot) => void
  // When given, an empty week shows "try next week" with this button.
  // The clinic page leaves it out and shows the empty grid instead.
  onNextWeek?: () => void
}

// Shown instead of the grid when there is nothing to show or something went wrong.
function Message({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    // Also a tour target, so the tour does not wait for a grid that will not appear.
    <div
      data-tour="calendar"
      className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-16 text-center shadow-sm"
    >
      <div className="text-muted-foreground">{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  )
}

// The weekly calendar with all its states, shared by the Book and Clinic pages.
function SlotCalendar({ slots, services, days, loading, error, onRetry, mode, onSelect, onNextWeek }: Props) {
  if (error) {
    return (
      <Message icon={<TriangleAlert className="size-10" />} title="Something went wrong">
        <p className="text-muted-foreground">{error.message}</p>
        <Button onClick={onRetry}>Retry</Button>
      </Message>
    )
  }
  if (loading || !slots || !services) {
    return <Skeleton className="h-[640px] rounded-2xl" aria-label="Loading slots" />
  }
  if (slots.length === 0 && onNextWeek) {
    return (
      <Message icon={<CalendarX className="size-10" />} title="No free slots this week — try next week">
        <Button onClick={onNextWeek}>Go to next week</Button>
      </Message>
    )
  }
  return (
    <>
      <div className="hidden md:block" data-tour="calendar">
        <WeekGrid days={days} slots={slots} services={services} mode={mode} onSelect={onSelect} />
      </div>
      <div className="md:hidden" data-tour="calendar">
        <DayList days={days} slots={slots} services={services} mode={mode} onSelect={onSelect} />
      </div>
      <div className="mt-4">
        <Legend services={services} />
      </div>
    </>
  )
}

export default SlotCalendar

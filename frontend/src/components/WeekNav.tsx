import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatWeekRange } from '@/lib/slots'

type Props = {
  weekStart: Date
  onPrevious: () => void
  onToday: () => void
  onNext: () => void
}

function WeekNav({ weekStart, onPrevious, onToday, onNext }: Props) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center rounded-xl border bg-card shadow-sm">
        <Button variant="ghost" size="icon" className="size-10" onClick={onPrevious} aria-label="Previous week">
          <ChevronLeft className="size-5" />
        </Button>
        <Button variant="ghost" className="h-10 border-x px-5 text-base" onClick={onToday}>
          Today
        </Button>
        <Button variant="ghost" size="icon" className="size-10" onClick={onNext} aria-label="Next week">
          <ChevronRight className="size-5" />
        </Button>
      </div>
      <span className="text-lg font-semibold">{formatWeekRange(weekStart)}</span>
    </div>
  )
}

export default WeekNav

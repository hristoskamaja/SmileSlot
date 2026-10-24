import { useEffect, useRef } from 'react'
import { addWeeks } from 'date-fns'
import { currentWeekStart, dayKey, shouldStartNextWeek } from '@/lib/slots'
import type { Slot } from '@/types'

// On the first load, moves to next week when this week is over (see shouldStartNextWeek).
// Call it after the slots query, with the slots of the week that is shown.
export function useDefaultWeek(weekStart: Date, setWeekStart: (week: Date) => void, slots: Slot[] | undefined) {
  const decided = useRef(false)

  useEffect(() => {
    if (decided.current || !slots) return
    decided.current = true // only the first week that loads counts, so later clicks are never overruled

    // If the user already clicked to another week before the data arrived, leave it alone.
    const showsCurrentWeek = dayKey(weekStart) === dayKey(currentWeekStart())
    if (showsCurrentWeek && shouldStartNextWeek(slots)) setWeekStart(addWeeks(weekStart, 1))
  }, [slots, weekStart, setWeekStart])
}

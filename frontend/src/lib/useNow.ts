import { useEffect, useState } from 'react'

// The current time, refreshed every minute. The page re-renders when it changes.
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer) // stop the timer when the component goes away
  }, [])

  return now
}

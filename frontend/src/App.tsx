import { useEffect, useState } from 'react'
import { getHealth } from '@/api/client'

// Phase 0 placeholder: proves the frontend can reach the backend.
// Replaced by the real pages in Phase 1.
function App() {
  const [apiStatus, setApiStatus] = useState('checking...')

  useEffect(() => {
    getHealth()
      .then((data) => setApiStatus(data.status))
      .catch(() => setApiStatus('unreachable'))
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2">
      <h1 className="text-3xl font-semibold">SmileSlot</h1>
      <p className="text-muted-foreground">API: {apiStatus}</p>
    </main>
  )
}

export default App

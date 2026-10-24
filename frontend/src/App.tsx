import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import Header from '@/components/Header'
import { applyTheme, getInitialTheme, saveTheme } from '@/lib/theme'
import BookPage from '@/pages/BookPage'
import ClinicPage from '@/pages/ClinicPage'

function App() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => applyTheme(theme), [theme])

  // Only a click is saved, so a first-time visitor keeps following the system setting.
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    saveTheme(next)
  }

  return (
    <>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Routes>
          <Route path="/" element={<BookPage />} />
          <Route path="/clinic" element={<ClinicPage />} />
        </Routes>
      </main>
      {/* Sonner doesn't read the "dark" class on <html>, so it is told the theme. */}
      <Toaster richColors position="top-center" theme={theme} />
    </>
  )
}

export default App

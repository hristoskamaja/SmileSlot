import { Route, Routes } from 'react-router-dom'
import Header from '@/components/Header'
import BookPage from '@/pages/BookPage'
import ClinicPage from '@/pages/ClinicPage'

function App() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Routes>
          <Route path="/" element={<BookPage />} />
          <Route path="/clinic" element={<ClinicPage />} />
        </Routes>
      </main>
    </>
  )
}

export default App

import { Route, Routes } from 'react-router-dom'
import Header from '@/components/Header'
import BookPage from '@/pages/BookPage'

function App() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Routes>
          <Route path="/" element={<BookPage />} />
          {/* Placeholder until the Clinic page is built. */}
          <Route path="/clinic" element={<h1 className="text-3xl font-bold">Clinic</h1>} />
        </Routes>
      </main>
    </>
  )
}

export default App

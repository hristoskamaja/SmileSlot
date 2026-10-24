import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createBooking } from '@/api/client'
import BookingDialog from '@/components/BookingDialog'
import { makeSlot } from '@/test/factories'
import type { CreatedBooking, Doctor } from '@/types'

// No real network and no real toasts: the API call and sonner are replaced by mocks.
vi.mock('@/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client')>()),
  createBooking: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const doctor: Doctor = { id: 1, name: 'Dr. Test', specialty: 'General', color: '#0ea5e9', google_calendar_id: null }

const createdBooking: CreatedBooking = {
  id: 10,
  slot_id: 1,
  patient_name: 'Ana',
  patient_email: 'ana@example.com',
  note: null,
  ai_message: 'Hi Ana, see you soon!',
  created_at: '2026-07-15T10:00:00Z',
  cancel_token: 'secret-token',
}

beforeEach(() => {
  vi.resetAllMocks()
})

// Opens the dialog, fills in the form and presses "Book appointment".
async function bookAs(name: string, email: string, phone = '') {
  const queryClient = new QueryClient()
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <BookingDialog slot={makeSlot()} doctor={doctor} serviceName="Cleaning" onClose={onClose} />
    </QueryClientProvider>,
  )

  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Full name'), name)
  await user.type(screen.getByLabelText('Email'), email)
  if (phone) await user.type(screen.getByLabelText(/Phone/), phone)
  await user.click(screen.getByRole('button', { name: 'Book appointment' }))
  return { invalidate, onClose }
}

describe('BookingDialog', () => {
  it('shows the backend message, refetches the week and closes when the slot was just booked (409)', async () => {
    vi.mocked(createBooking).mockRejectedValue(new ApiError('Sorry, this slot was just booked', 409))

    const { invalidate, onClose } = await bookAs('Ana', 'ana@example.com')

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Sorry, this slot was just booked'))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['slots'] })
    expect(onClose).toHaveBeenCalled()
  })

  it('shows the confirmation, and keeps the phone out of localStorage', async () => {
    vi.mocked(createBooking).mockResolvedValue(createdBooking)

    await bookAs('Ana', 'ana@example.com', '070 123 456')

    expect(await screen.findByText("You're booked!")).toBeInTheDocument()
    expect(screen.getByText('Hi Ana, see you soon!')).toBeInTheDocument()
    // The phone is sent to the backend...
    expect(vi.mocked(createBooking).mock.calls[0][0]).toMatchObject({ patient_phone: '070 123 456' })
    // ...but the snapshot in localStorage only has what "My appointments" needs.
    const saved = localStorage.getItem('smileslot-my-bookings') ?? ''
    expect(saved).toContain('secret-token')
    expect(saved).not.toContain('070 123 456')
  })
})

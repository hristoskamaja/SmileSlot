import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SlotBlock from '@/components/SlotBlock'
import { makeSlot } from '@/test/factories'
import type { Slot } from '@/types'

beforeEach(() => {
  vi.setSystemTime(new Date('2026-07-15T10:00:00Z')) // the default test slot (July 20) is in the future
})

afterEach(() => {
  vi.useRealTimers()
})

function renderBlock(slot: Slot, { mode = 'book', mine = false } = {}) {
  const onSelect = vi.fn()
  render(
    <SlotBlock
      slot={slot}
      serviceName="Cleaning"
      style={{}}
      mode={mode as 'book' | 'clinic'}
      mine={mine}
      onSelect={onSelect}
    />,
  )
  return { button: screen.getByRole('button'), onSelect }
}

describe('SlotBlock in the Book page', () => {
  it('lets the patient click a free slot', async () => {
    const slot = makeSlot()
    const { button, onSelect } = renderBlock(slot)

    expect(button).toHaveTextContent('Cleaning')
    expect(button).toBeEnabled()
    await userEvent.click(button)
    expect(onSelect).toHaveBeenCalledWith(slot)
  })

  it('shows a slot booked by someone else as "Booked", not clickable, without the name', () => {
    const { button } = renderBlock(makeSlot({ status: 'booked', patient_name: 'Ana' }))

    expect(button).toHaveTextContent('Booked')
    expect(button).not.toHaveTextContent('Ana')
    expect(button).toBeDisabled()
  })

  it('shows my own booking as "Your booking"', () => {
    const { button } = renderBlock(makeSlot({ status: 'booked' }), { mine: true })

    expect(button).toHaveTextContent('Your booking')
    expect(button).toBeDisabled()
  })

  it('shows a busy slot as "Doctor busy", with a tooltip, not clickable', () => {
    const { button } = renderBlock(makeSlot({ status: 'calendar_busy' }))

    expect(button).toHaveTextContent('Doctor busy')
    expect(button).toHaveAttribute('title', 'Doctor is busy (Google Calendar)')
    expect(button).toBeDisabled()
  })

  it('dims a slot in the past and does not let anyone click it', () => {
    const { button } = renderBlock(makeSlot({ start_at: '2026-07-10T08:00:00Z' }))

    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50')
  })
})

describe('SlotBlock in the Clinic page', () => {
  it('keeps a busy slot clickable, so the staff can delete it', () => {
    const { button } = renderBlock(makeSlot({ status: 'calendar_busy' }), { mode: 'clinic' })

    expect(button).toBeEnabled()
  })
})

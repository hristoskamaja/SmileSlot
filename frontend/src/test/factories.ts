import type { Slot } from '@/types'

// A slot for tests. Pass only what a test cares about, e.g. makeSlot({ status: 'booked' }).
export function makeSlot(overrides: Partial<Slot> = {}): Slot {
  return {
    id: 1,
    doctor_id: 1,
    service_id: 1,
    start_at: '2026-07-20T08:00:00Z', // 10:00 in the clinic (summer time)
    duration_minutes: 30,
    status: 'available',
    patient_name: null,
    ...overrides,
  }
}

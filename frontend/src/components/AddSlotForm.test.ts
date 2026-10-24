import { describe, expect, it } from 'vitest'
import { slotSchema } from '@/components/AddSlotForm'
import { todayInClinic } from '@/lib/slots'

const valid = { date: todayInClinic(), start_time: '09:00', service_id: '1', duration_minutes: '30' }

// The name of the first field that fails, or null when everything is fine.
function failingField(changes: Partial<typeof valid>): string | null {
  const result = slotSchema.safeParse({ ...valid, ...changes })
  return result.success ? null : String(result.error.issues[0].path[0])
}

describe('the slot must end by 18:00', () => {
  it('allows a slot that ends exactly at 18:00', () => {
    expect(failingField({ start_time: '17:40', duration_minutes: '20' })).toBeNull()
    expect(failingField({ start_time: '17:00', duration_minutes: '60' })).toBeNull()
  })

  it('rejects a slot that ends after 18:00, and blames the duration', () => {
    expect(failingField({ start_time: '17:45', duration_minutes: '20' })).toBe('duration_minutes')
    expect(failingField({ start_time: '17:15', duration_minutes: '60' })).toBe('duration_minutes')
  })

  it('explains what to change', () => {
    const result = slotSchema.safeParse({ ...valid, start_time: '17:45', duration_minutes: '20' })
    expect(result.error?.issues[0].message).toContain('18:00')
  })
})

describe('the other fields', () => {
  it('rejects a date in the past', () => {
    expect(failingField({ date: '2000-01-01' })).toBe('date')
  })

  it('rejects a duration of 0', () => {
    expect(failingField({ duration_minutes: '0' })).toBe('duration_minutes')
  })

  it('needs a date, a start time and a service', () => {
    expect(failingField({ date: '' })).toBe('date')
    expect(failingField({ start_time: '' })).toBe('start_time')
    expect(failingField({ service_id: '' })).toBe('service_id')
  })
})

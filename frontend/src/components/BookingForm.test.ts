import { describe, expect, it } from 'vitest'
import { bookingSchema } from '@/components/BookingForm'

const valid = { patient_name: 'Ana Petrova', patient_email: 'ana@example.com', patient_phone: '', note: '' }

// The name of the first field that fails, or null when everything is fine.
function failingField(changes: Partial<typeof valid>): string | null {
  const result = bookingSchema.safeParse({ ...valid, ...changes })
  return result.success ? null : String(result.error.issues[0].path[0])
}

describe('name', () => {
  it('is required, also when it is only spaces', () => {
    expect(failingField({ patient_name: '' })).toBe('patient_name')
    expect(failingField({ patient_name: '   ' })).toBe('patient_name')
  })

  it('can be at most 100 characters', () => {
    expect(failingField({ patient_name: 'a'.repeat(100) })).toBeNull()
    expect(failingField({ patient_name: 'a'.repeat(101) })).toBe('patient_name')
  })
})

describe('email', () => {
  it('must look like an email address', () => {
    expect(failingField({ patient_email: 'not-an-email' })).toBe('patient_email')
    expect(failingField({ patient_email: '' })).toBe('patient_email')
  })

  it('ignores spaces around it', () => {
    expect(failingField({ patient_email: '  ana@example.com  ' })).toBeNull()
  })
})

describe('phone (optional)', () => {
  it.each(['', '   ', '070 123 456', '+389 (2) 123-456', '123456', '1'.repeat(20)])('accepts "%s"', (phone) => {
    expect(failingField({ patient_phone: phone })).toBeNull()
  })

  it.each(['12345', '1'.repeat(21), '070-abc-123', '070.123.456'])('rejects "%s"', (phone) => {
    expect(failingField({ patient_phone: phone })).toBe('patient_phone')
  })
})

describe('note (optional)', () => {
  it('can be at most 500 characters', () => {
    expect(failingField({ note: 'a'.repeat(500) })).toBeNull()
    expect(failingField({ note: 'a'.repeat(501) })).toBe('note')
  })
})

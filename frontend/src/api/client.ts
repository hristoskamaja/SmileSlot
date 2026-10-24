// All HTTP calls to the backend live in this file.
import type { Doctor, Service, Slot } from '@/types'

const API_URL = import.meta.env.VITE_API_URL

// Every error from the backend has the shape { "detail": "message" }.
// Turn it into a normal Error so the UI can show error.message.
async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message = typeof body?.detail === 'string' ? body.detail : `Request failed (${response.status})`
    throw new Error(message)
  }
  return response.json()
}

export function getDoctors(): Promise<Doctor[]> {
  return request('/doctors')
}

export function getServices(): Promise<Service[]> {
  return request('/services')
}

// weekStart is a date like "2026-10-19"; serviceId is optional.
export function getSlots(doctorId: number, weekStart: string, serviceId?: number): Promise<Slot[]> {
  const params = new URLSearchParams({ doctor_id: String(doctorId), week_start: weekStart })
  if (serviceId !== undefined) params.set('service_id', String(serviceId))
  return request(`/slots?${params}`)
}

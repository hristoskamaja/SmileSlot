// All HTTP calls to the backend live in this file.
const API_URL = import.meta.env.VITE_API_URL

export async function getHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_URL}/health`)
  if (!response.ok) throw new Error(`Health check failed: ${response.status}`)
  return response.json()
}

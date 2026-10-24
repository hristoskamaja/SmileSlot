import '@testing-library/jest-dom/vitest' // adds matchers like toBeDisabled() and toHaveTextContent()
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Remove what a test rendered, so the next test starts with an empty page.
afterEach(() => {
  cleanup()
  localStorage.clear()
})

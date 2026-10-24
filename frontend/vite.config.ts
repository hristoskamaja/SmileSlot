import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // "@/components/..." -> "src/components/..." (used by shadcn/ui)
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  // Tests run in a fake browser (jsdom). Run them with "npm test".
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Not the clinic's time zone on purpose: the app must show clinic time whatever the browser's time zone is.
    env: { TZ: 'America/Los_Angeles' },
  },
})

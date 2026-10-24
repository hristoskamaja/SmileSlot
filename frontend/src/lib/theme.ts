export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'smileslot-theme'

// The saved choice, or else the system setting. (index.html does the same before the page is drawn.)
export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Storage is blocked (private mode, browser settings): fall back to the system setting.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// The dark colors in index.css apply to everything inside <html class="dark">.
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage is blocked: the choice just won't be remembered.
  }
}

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'smileslot-theme'

// The saved choice, or else light. The system setting (prefers-color-scheme) is ignored on purpose:
// dark mode only starts after the user clicked the toggle. (index.html does the same before the page is drawn.)
export function getInitialTheme(): Theme {
  try {
    if (localStorage.getItem(STORAGE_KEY) === 'dark') return 'dark'
  } catch {
    // Storage is blocked (private mode, browser settings): use the light theme.
  }
  return 'light'
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

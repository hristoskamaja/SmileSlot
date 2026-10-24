import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, getInitialTheme, saveTheme } from './theme'

afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.classList.remove('dark')
})

describe('getInitialTheme', () => {
  it('is light when nothing is saved, even if the system prefers dark', () => {
    // jsdom has no matchMedia; this fake says "dark" to prove it is ignored.
    const matchMedia = vi.fn().mockReturnValue({ matches: true })
    vi.stubGlobal('matchMedia', matchMedia)

    expect(getInitialTheme()).toBe('light')
    expect(matchMedia).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('returns the saved choice', () => {
    localStorage.setItem('smileslot-theme', 'dark')
    expect(getInitialTheme()).toBe('dark')

    localStorage.setItem('smileslot-theme', 'light')
    expect(getInitialTheme()).toBe('light')
  })

  it('is light when the saved value is not a theme', () => {
    localStorage.setItem('smileslot-theme', 'purple')
    expect(getInitialTheme()).toBe('light')
  })

  it('is light when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(getInitialTheme()).toBe('light')
  })
})

describe('saveTheme', () => {
  it('saves the choice in localStorage', () => {
    saveTheme('dark')
    expect(localStorage.getItem('smileslot-theme')).toBe('dark')
  })

  it('does not throw when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => saveTheme('dark')).not.toThrow()
  })
})

describe('applyTheme', () => {
  it('adds and removes the dark class on <html>', () => {
    applyTheme('dark')
    expect(document.documentElement).toHaveClass('dark')

    applyTheme('light')
    expect(document.documentElement).not.toHaveClass('dark')
  })
})

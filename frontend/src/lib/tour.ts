import { driver, type Driver, type PopoverDOM } from 'driver.js'
import 'driver.js/dist/driver.css'

const SEEN_KEY = 'smileslot-tour-seen'
const MAX_WAIT_MS = 8000 // how long to wait for the page to show the tour's targets

// Each step points at an element with a matching data-tour="..." attribute.
const STEPS = [
  {
    target: 'doctor-select',
    title: 'Choose your doctor',
    description: 'Pick a doctor from the dropdown. Each doctor has their own weekly schedule.',
    side: 'bottom',
  },
  {
    target: 'service-filters',
    title: 'Pick a service',
    description: 'Filter by service, like Check-up or Cleaning, to see only the matching times.',
    side: 'bottom',
  },
  {
    target: 'calendar',
    title: 'Click a colored slot to book',
    description:
      'Every colored block is a free time. Striped blocks are already booked. Click a free one to add your name and email.',
    side: 'top',
  },
  {
    target: 'help-button',
    title: 'Need a hand later?',
    description: 'Click the ? any time to see this guide again.',
    side: 'bottom',
  },
] as const

// Storage can be blocked (private mode, browser settings), so every access is wrapped in try/catch.
export function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === 'true'
  } catch {
    return false
  }
}

function markTourSeen() {
  try {
    localStorage.setItem(SEEN_KEY, 'true')
  } catch {
    // Storage is blocked: the tour will simply show again next time.
  }
}

// The first element with this data-tour name that is actually visible.
// The calendar exists twice (desktop grid and mobile list); CSS hides one of them.
function findTarget(name: string): HTMLElement | null {
  const matches = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)
  return Array.from(matches).find((element) => element.getClientRects().length > 0) ?? null
}

// Resolves once every target is on the page (the calendar only appears after the slots
// have loaded), or after MAX_WAIT_MS so a broken page can't make us wait forever.
function waitForTargets(): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = Date.now()
    const timer = setInterval(() => {
      const ready = STEPS.every((step) => findTarget(step.target))
      if (ready || Date.now() - startedAt > MAX_WAIT_MS) {
        clearInterval(timer)
        resolve()
      }
    }, 100)
  })
}

// Driver puts "1 of 4" in the footer. The design has it above the title and dots in the footer.
function arrangePopover(popover: PopoverDOM, totalSteps: number, activeIndex: number) {
  popover.title.before(popover.progress)

  const dots = document.createElement('div')
  dots.className = 'tour-dots'
  for (let i = 0; i < totalSteps; i++) {
    const dot = document.createElement('span')
    dot.className = i === activeIndex ? 'tour-dot tour-dot-active' : 'tour-dot'
    dots.appendChild(dot)
  }
  popover.footer.prepend(dots)
}

let activeTour: Driver | null = null
let latestRun = 0

// Starts the tour on the Book page. Safe to call at any time, also from another page:
// it waits until the Book page's elements exist.
export async function startTour() {
  const run = ++latestRun // if startTour() is called again while we wait, only the newest call goes on
  activeTour?.destroy()
  activeTour = null

  await waitForTargets()
  if (run !== latestRun || window.location.pathname !== '/') return

  // If something is still missing after the wait, skip just that step.
  const steps = STEPS.filter((step) => findTarget(step.target)).map((step) => ({
    // A function, so the element is looked up again when the step is shown (React may have replaced it).
    element: () => findTarget(step.target) ?? document.body,
    popover: { title: step.title, description: step.description, side: step.side },
  }))
  if (steps.length === 0) return

  activeTour = driver({
    steps,
    showProgress: true,
    progressText: 'Booking guide · {{current}} of {{total}}',
    prevBtnText: '← Back',
    nextBtnText: 'Next →',
    doneBtnText: 'Done',
    popoverClass: 'smileslot-tour', // our styles in index.css
    overlayColor: '#10282d',
    overlayOpacity: 0.55,
    stagePadding: 8,
    stageRadius: 16,
    onPopoverRender: (popover, { state }) => arrangePopover(popover, steps.length, state.activeIndex ?? 0),
    onDestroyed: markTourSeen, // runs however the tour ends: Done, the X or Esc
  })
  activeTour.drive()
}

import { driver, type Driver, type PopoverDOM, type Side } from 'driver.js'
import 'driver.js/dist/driver.css'

const MAX_WAIT_MS = 8000 // how long to wait for the page to show the tour's targets

type TourStep = {
  target: string // the data-tour="..." attribute of the element to highlight
  title: string
  description: string
  side: Side
}

// One tour per page. Each has its own "seen" flag in localStorage.
const TOURS = {
  book: {
    path: '/',
    seenKey: 'smileslot-tour-seen',
    steps: [
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
    ] satisfies TourStep[],
  },
  clinic: {
    path: '/clinic',
    seenKey: 'smileslot-clinic-tour-seen',
    steps: [
      {
        target: 'doctor-select',
        title: 'Choose a doctor',
        description: 'The schedule below belongs to the selected doctor.',
        side: 'bottom',
      },
      {
        target: 'stats',
        title: 'Your week at a glance',
        description: 'See how many slots you have this week, how many are booked and how many are still free.',
        side: 'bottom',
      },
      {
        target: 'add-slot-form',
        title: 'Open a new time',
        description:
          'Pick a date, a start time and a service. The duration fills in automatically, but you can change it.',
        side: 'right',
      },
      {
        target: 'calendar',
        title: 'Manage your schedule',
        description: 'Striped blocks show who has booked. Click a free block to delete it.',
        side: 'top',
      },
    ] satisfies TourStep[],
  },
}

export type TourName = keyof typeof TOURS

// Which tour belongs to the page the user is on? null if there is none.
export function tourForPath(pathname: string): TourName | null {
  const names = Object.keys(TOURS) as TourName[]
  return names.find((name) => TOURS[name].path === pathname) ?? null
}

// Storage can be blocked (private mode, browser settings), so every access is wrapped in try/catch.
export function hasSeenTour(name: TourName): boolean {
  try {
    return localStorage.getItem(TOURS[name].seenKey) === 'true'
  } catch {
    return false
  }
}

function markTourSeen(name: TourName) {
  try {
    localStorage.setItem(TOURS[name].seenKey, 'true')
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
function waitForTargets(steps: TourStep[]): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = Date.now()
    const timer = setInterval(() => {
      const ready = steps.every((step) => findTarget(step.target))
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

// Starts the tour of a page. Safe to call before the page has finished loading:
// it waits until the page's elements exist.
export async function startTour(name: TourName) {
  const tour = TOURS[name]
  const run = ++latestRun // if startTour() is called again while we wait, only the newest call goes on
  activeTour?.destroy()
  activeTour = null

  await waitForTargets(tour.steps)
  // Stop if a newer call took over, or if the user has left this tour's page while we waited.
  if (run !== latestRun || window.location.pathname !== tour.path) return

  // If something is still missing after the wait, skip just that step.
  const steps = tour.steps
    .filter((step) => findTarget(step.target))
    .map((step) => ({
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
    onDestroyed: () => markTourSeen(name), // runs however the tour ends: Done, the X or Esc
  })
  activeTour.drive()
}

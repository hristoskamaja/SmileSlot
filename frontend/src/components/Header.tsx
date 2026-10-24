import { CircleHelp, Smile } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { startTour } from '@/lib/tour'
import { cn } from '@/lib/utils'

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    'rounded-lg px-4 py-2 text-base font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
    isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
  )
}

function Header() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  function restartTour() {
    if (pathname !== '/') navigate('/') // the tour is about the Book page
    startTour() // waits until that page's elements exist
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Smile className="size-6" aria-hidden />
          </span>
          <span className="text-xl font-bold tracking-tight">
            Smile<span className="text-primary">Slot</span>
          </span>
        </div>

        <nav className="flex gap-1" aria-label="Main">
          <NavLink to="/" end className={navClass}>
            Book
          </NavLink>
          <NavLink to="/clinic" className={navClass}>
            Clinic
          </NavLink>
        </nav>

        <Button
          variant="outline"
          size="icon"
          className="ml-auto size-10 rounded-full"
          aria-label="Restart tour"
          data-tour="help-button"
          onClick={restartTour}
        >
          <CircleHelp className="size-5" />
        </Button>
      </div>
    </header>
  )
}

export default Header

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Service } from '@/types'

type Props = {
  services: Service[]
  selectedId: number | null // null means "All"
  onChange: (serviceId: number | null) => void
}

function ServiceChips({ services, selectedId, onChange }: Props) {
  const chips = [{ id: null, name: 'All' }, ...services]

  return (
    <div className="flex flex-wrap gap-2" data-tour="service-filters" role="group" aria-label="Filter by service">
      {chips.map((chip) => {
        const active = chip.id === selectedId
        return (
          <Button
            key={chip.name}
            variant={active ? 'default' : 'outline'}
            aria-pressed={active}
            onClick={() => onChange(chip.id)}
            className={cn('h-10 rounded-full px-5 text-base', !active && 'bg-card text-muted-foreground')}
          >
            {chip.name}
          </Button>
        )
      })}
    </div>
  )
}

export default ServiceChips

import { serviceStyle } from '@/lib/slots'
import type { Service } from '@/types'

type Props = {
  services: Service[]
}

function Legend({ services }: Props) {
  return (
    <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground">
      {services.map((service) => (
        <li key={service.id} className="flex items-center gap-2">
          <span className="size-4 rounded border" style={serviceStyle(service.name)} aria-hidden />
          {service.name}
        </li>
      ))}
      <li className="h-5 w-px bg-border" aria-hidden />
      <li className="flex items-center gap-2">
        <span className="booked-stripes size-4 rounded border" aria-hidden />
        Booked
      </li>
    </ul>
  )
}

export default Legend

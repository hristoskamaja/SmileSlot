import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import type { Doctor } from '@/types'

type Props = {
  doctors: Doctor[]
  selectedId: number
  onChange: (doctorId: number) => void
}

// "Dr. Elena Petrova" -> "EP"
function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s*/, '')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
}

function DoctorLabel({ doctor }: { doctor: Doctor }) {
  return (
    <span className="flex items-center gap-3 text-left">
      {/* The doctor's color plus "26" (hex for ~15% opacity) gives a soft background. */}
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
        style={{ backgroundColor: `${doctor.color}26`, color: doctor.color }}
        aria-hidden
      >
        {initials(doctor.name)}
      </span>
      <span className="flex flex-col">
        <span className="text-base font-semibold leading-tight text-foreground">{doctor.name}</span>
        <span className="text-sm font-normal text-muted-foreground">{doctor.specialty}</span>
      </span>
    </span>
  )
}

function DoctorSelect({ doctors, selectedId, onChange }: Props) {
  const selected = doctors.find((doctor) => doctor.id === selectedId) ?? doctors[0]

  return (
    <Select value={String(selected.id)} onValueChange={(value) => value && onChange(Number(value))}>
      <SelectTrigger
        aria-label="Doctor"
        // data-[size=default]:h-auto is needed because the shadcn trigger sets a fixed height the same way.
        className="w-full min-w-72 rounded-2xl bg-card px-4 py-2.5 shadow-sm data-[size=default]:h-auto sm:w-auto sm:min-w-80"
      >
        <DoctorLabel doctor={selected} />
      </SelectTrigger>
      <SelectContent>
        {doctors.map((doctor) => (
          <SelectItem key={doctor.id} value={String(doctor.id)} className="py-2">
            <DoctorLabel doctor={doctor} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default DoctorSelect

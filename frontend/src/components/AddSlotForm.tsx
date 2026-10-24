import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createSlot } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { DAY_END_HOUR, DAY_START_HOUR, todayInClinic } from '@/lib/slots'
import type { Service } from '@/types'

// "09:30" -> 570
function toMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

// Every field is a string because the date input and the selects all work with strings.
const slotSchema = z
  .object({
    date: z
      .string()
      .min(1, 'Pick a date')
      .refine((date) => date >= todayInClinic(), 'The date cannot be in the past'),
    start_time: z.string().min(1, 'Pick a start time'),
    service_id: z.string().min(1, 'Pick a service'),
    duration_minutes: z.string().refine((value) => Number(value) > 0, 'Duration must be greater than 0'),
  })
  .refine((slot) => !slot.start_time || toMinutes(slot.start_time) + Number(slot.duration_minutes) <= DAY_END_HOUR * 60, {
    path: ['duration_minutes'], // shown under the Duration field
    error: `The slot would end after ${DAY_END_HOUR}:00. Choose an earlier start or a shorter duration.`,
  })

type SlotFormValues = z.infer<typeof slotSchema>

// 08:00, 08:15 ... 17:45. A slot starting at 18:00 would be below the grid.
const START_TIMES = Array.from({ length: (DAY_END_HOUR - DAY_START_HOUR) * 4 }, (_, i) => {
  const minutes = DAY_START_HOUR * 60 + i * 15
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})

// 5, 10 ... 180. In steps of 5 so that 20 min (Check-up) and 45 min (Whitening) are included.
const DURATIONS = Array.from({ length: 36 }, (_, i) => (i + 1) * 5)

const fieldClass = 'h-12 w-full rounded-xl bg-card px-4 text-base data-[size=default]:h-12 md:text-base'

type Option = { value: string; label: string }

// A labelled select. The trigger shows the selected option's label itself,
// because the library's own value display can show the raw value before it is opened.
function FormSelect({ id, value, options, invalid, onChange }: {
  id: string
  value: string
  options: Option[]
  invalid: boolean
  onChange: (value: string) => void
}) {
  const selected = options.find((option) => option.value === value)
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger id={id} aria-invalid={invalid} aria-describedby={`${id}_error`} className={fieldClass}>
        {selected?.label ?? 'Select…'}
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-destructive">
      {message}
    </p>
  )
}

type Props = {
  doctorId: number
  services: Service[]
}

function AddSlotForm({ doctorId, services }: Props) {
  const queryClient = useQueryClient()
  const {
    register,
    control,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<SlotFormValues>({
    resolver: zodResolver(slotSchema),
    defaultValues: {
      date: todayInClinic(),
      start_time: '09:00',
      service_id: String(services[0].id),
      duration_minutes: String(services[0].duration_minutes),
    },
  })

  // Start time and duration are checked together (the slot must end by 18:00),
  // so after the first submit, re-check the duration whenever either of them changes.
  function recheckDuration() {
    if (isSubmitted) trigger('duration_minutes')
  }

  const mutation = useMutation({
    mutationFn: createSlot,
    onSuccess: () => {
      toast.success('Slot added')
      queryClient.invalidateQueries({ queryKey: ['slots'] })
    },
  })

  function onSubmit(values: SlotFormValues) {
    mutation.mutate({
      doctor_id: doctorId,
      service_id: Number(values.service_id),
      start_at: `${values.date}T${values.start_time}`, // no offset: the backend reads it as clinic time
      duration_minutes: Number(values.duration_minutes),
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-tour="add-slot-form" className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <Plus className="size-5 text-primary" aria-hidden />
        Add slot
      </h2>

      <div>
        <label htmlFor="date" className="mb-1.5 block text-base font-medium">
          Date
        </label>
        <Input
          id="date"
          type="date"
          min={todayInClinic()}
          className={fieldClass}
          aria-invalid={!!errors.date}
          aria-describedby="date_error"
          {...register('date')}
        />
        <ErrorText id="date_error" message={errors.date?.message} />
      </div>

      <div>
        <label htmlFor="start_time" className="mb-1.5 block text-base font-medium">
          Start time
        </label>
        <Controller
          name="start_time"
          control={control}
          render={({ field }) => (
            <FormSelect
              id="start_time"
              value={field.value}
              options={START_TIMES.map((time) => ({ value: time, label: time }))}
              invalid={!!errors.start_time}
              onChange={(value) => {
                field.onChange(value)
                recheckDuration()
              }}
            />
          )}
        />
        <ErrorText id="start_time_error" message={errors.start_time?.message} />
      </div>

      <div>
        <label htmlFor="service_id" className="mb-1.5 block text-base font-medium">
          Service
        </label>
        <Controller
          name="service_id"
          control={control}
          render={({ field }) => (
            <FormSelect
              id="service_id"
              value={field.value}
              options={services.map((service) => ({ value: String(service.id), label: service.name }))}
              invalid={!!errors.service_id}
              onChange={(value) => {
                field.onChange(value)
                // Picking a service fills in its usual duration; it can still be changed below.
                const service = services.find((s) => String(s.id) === value)
                if (service) setValue('duration_minutes', String(service.duration_minutes))
                recheckDuration()
              }}
            />
          )}
        />
        <ErrorText id="service_id_error" message={errors.service_id?.message} />
      </div>

      <div>
        <label htmlFor="duration_minutes" className="mb-1.5 block text-base font-medium">
          Duration
        </label>
        <Controller
          name="duration_minutes"
          control={control}
          render={({ field }) => (
            <FormSelect
              id="duration_minutes"
              value={field.value}
              options={DURATIONS.map((minutes) => ({ value: String(minutes), label: `${minutes} min` }))}
              invalid={!!errors.duration_minutes}
              onChange={(value) => {
                field.onChange(value)
                recheckDuration()
              }}
            />
          )}
        />
        <ErrorText id="duration_minutes_error" message={errors.duration_minutes?.message} />
      </div>

      {/* The backend's message, e.g. "This overlaps with an existing slot at 09:30". */}
      {mutation.error && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}

      <Button type="submit" disabled={mutation.isPending} className="h-14 w-full rounded-full text-base font-semibold">
        {mutation.isPending && <Loader2 className="animate-spin" aria-hidden />}
        {mutation.isPending ? 'Adding…' : 'Add slot'}
      </Button>
    </form>
  )
}

export default AddSlotForm

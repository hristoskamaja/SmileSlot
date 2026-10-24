import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

// The same rules as the backend (BookingCreate), so most mistakes are caught before sending.
export const bookingSchema = z.object({
  patient_name: z.string().trim().min(1, 'Please enter your name').max(100, 'Name is too long (100 characters max)'),
  patient_email: z.string().trim().pipe(z.email('Please enter a valid email address')),
  // Optional: empty is fine, otherwise 6-20 characters of digits, spaces, + - ( ).
  patient_phone: z
    .string()
    .trim()
    .refine((phone) => phone === '' || (/^[0-9 +\-()]+$/.test(phone) && phone.length >= 6 && phone.length <= 20), {
      message: 'Phone must be 6–20 characters: digits, spaces, + - ( )',
    }),
  note: z.string().max(500, 'Note is too long (500 characters max)'),
})

export type BookingFormValues = z.infer<typeof bookingSchema>

type Props = {
  isPending: boolean
  onSubmit: (values: BookingFormValues) => void
}

const inputClass = 'h-12 rounded-xl bg-card px-4 text-base md:text-base'

function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-destructive">
      {message}
    </p>
  )
}

function BookingForm({ isPending, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { patient_name: '', patient_email: '', patient_phone: '', note: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label htmlFor="patient_name" className="mb-1.5 block text-base font-medium">
          Full name
        </label>
        <Input
          id="patient_name"
          autoComplete="name"
          className={inputClass}
          aria-invalid={!!errors.patient_name}
          aria-describedby="patient_name_error"
          {...register('patient_name')}
        />
        <ErrorText id="patient_name_error" message={errors.patient_name?.message} />
      </div>

      <div>
        <label htmlFor="patient_email" className="mb-1.5 block text-base font-medium">
          Email
        </label>
        <Input
          id="patient_email"
          type="email"
          autoComplete="email"
          className={inputClass}
          aria-invalid={!!errors.patient_email}
          aria-describedby="patient_email_error"
          {...register('patient_email')}
        />
        <ErrorText id="patient_email_error" message={errors.patient_email?.message} />
      </div>

      <div>
        <label htmlFor="patient_phone" className="mb-1.5 block text-base font-medium">
          Phone <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input
          id="patient_phone"
          type="tel"
          autoComplete="tel"
          className={inputClass}
          aria-invalid={!!errors.patient_phone}
          aria-describedby="patient_phone_error"
          {...register('patient_phone')}
        />
        <ErrorText id="patient_phone_error" message={errors.patient_phone?.message} />
      </div>

      <div>
        <label htmlFor="note" className="mb-1.5 block text-base font-medium">
          Note <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="note"
          rows={3}
          placeholder="Anything the doctor should know?"
          className="rounded-xl bg-card px-4 py-3 text-base md:text-base"
          aria-invalid={!!errors.note}
          aria-describedby="note_error"
          {...register('note')}
        />
        <ErrorText id="note_error" message={errors.note?.message} />
      </div>

      <Button type="submit" disabled={isPending} className="h-14 w-full rounded-full text-base font-semibold">
        {isPending && <Loader2 className="animate-spin" aria-hidden />}
        {isPending ? 'Booking…' : 'Book appointment'}
      </Button>
    </form>
  )
}

export default BookingForm

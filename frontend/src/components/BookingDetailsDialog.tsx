import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { getSlotBooking } from '@/api/client'
import BookingSummary from '@/components/BookingSummary'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { Doctor, Slot } from '@/types'

type Props = {
  slot: Slot
  doctor: Doctor
  serviceName: string
  onClose: () => void
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-base font-medium">{value ?? 'Not provided'}</dd>
    </div>
  )
}

// Read-only details of a booked slot, for the clinic page.
// Like the other dialogs, the page only renders it while a slot is selected.
function BookingDetailsDialog({ slot, doctor, serviceName, onClose }: Props) {
  const query = useQuery({ queryKey: ['slot-booking', slot.id], queryFn: () => getSlotBooking(slot.id) })
  const booking = query.data

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto rounded-3xl p-6 sm:max-w-[600px] sm:p-8">
        <DialogTitle className="text-2xl font-bold">Booking details</DialogTitle>
        <BookingSummary slot={slot} doctor={doctor} serviceName={serviceName} />

        {query.isPending && <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" aria-label="Loading" />}
        {query.error && (
          <div className="space-y-3 text-center">
            <p className="text-muted-foreground">{query.error.message}</p>
            <Button variant="outline" onClick={() => query.refetch()}>
              Retry
            </Button>
          </div>
        )}
        {booking && (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Patient" value={booking.patient_name} />
            <Field label="Email" value={booking.patient_email} />
            <Field label="Phone" value={booking.patient_phone} />
            {/* Empty means nothing was entered: the backend stores no note then, or null. */}
            <Field label="Note" value={booking.note || null} />
          </dl>
        )}

        <Button variant="outline" onClick={onClose} className="h-12 w-full rounded-full text-base font-semibold">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export default BookingDetailsDialog

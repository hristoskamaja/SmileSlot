import { useState } from 'react'
import CancelBookingDialog from '@/components/CancelBookingDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  CANCELLATION_HOURS,
  canCancelBooking,
  isCancellable,
  upcomingBookings,
  useMyBookings,
  type CancellableBooking,
} from '@/lib/myBookings'
import { formatSlotDate, formatTime } from '@/lib/slots'

type Props = {
  onClose: () => void
}

// The upcoming appointments booked in this browser, soonest first.
function MyAppointmentsDialog({ onClose }: Props) {
  const { data: bookings = [] } = useMyBookings()
  const [bookingToCancel, setBookingToCancel] = useState<CancellableBooking | null>(null) // the one in the confirm

  const upcoming = upcomingBookings(bookings)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto rounded-3xl p-6 sm:max-w-[520px] sm:p-8">
        <div className="space-y-1">
          <DialogTitle className="text-2xl font-bold">My appointments</DialogTitle>
          <DialogDescription className="text-base">Appointments booked on this device.</DialogDescription>
        </div>

        {upcoming.length === 0 ? (
          <p className="rounded-2xl border bg-muted/50 px-5 py-8 text-center text-base text-muted-foreground">
            No upcoming appointments yet
          </p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((booking) => {
              const allowed = canCancelBooking(booking)
              return (
                <li key={`${booking.slot_id}-${booking.start_at}`} className="rounded-2xl border bg-card px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold">{booking.service_name}</div>
                      <div className="text-muted-foreground">{booking.doctor_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-semibold">{formatSlotDate(booking.start_at)}</div>
                      <div className="text-muted-foreground">{formatTime(booking.start_at)}</div>
                    </div>
                  </div>

                  {/* Old entries saved without a token can't be cancelled, so they get no button. */}
                  {isCancellable(booking) && (
                    <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
                      {!allowed && (
                        <p className="text-sm text-muted-foreground">
                          Can't cancel within {CANCELLATION_HOURS} hours of the appointment
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto"
                        disabled={!allowed}
                        aria-label={`Cancel ${booking.service_name} on ${formatSlotDate(booking.start_at)}`}
                        onClick={() => setBookingToCancel(booking)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {/* Inside the dialog (not beside it), so clicks in the confirm don't count as outside clicks. */}
        {bookingToCancel && (
          <CancelBookingDialog
            key={bookingToCancel.booking_id}
            booking={bookingToCancel}
            onClose={() => setBookingToCancel(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default MyAppointmentsDialog

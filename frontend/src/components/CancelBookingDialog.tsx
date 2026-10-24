import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, cancelBooking } from '@/api/client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MY_BOOKINGS_KEY, removeMyBooking, type CancellableBooking } from '@/lib/myBookings'
import { formatSlotDate, formatTime } from '@/lib/slots'

type Props = {
  booking: CancellableBooking
  onClose: () => void
}

// Asks "are you sure?" before cancelling one of my appointments.
// Like the other dialogs, its parent only renders it while an appointment is selected.
function CancelBookingDialog({ booking, onClose }: Props) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => cancelBooking(booking.booking_id, booking.cancel_token),
    onSuccess: () => {
      removeMyBooking(booking.booking_id)
      toast.success('Appointment cancelled')
    },
    onError: (error) => {
      toast.error(error.message) // e.g. "Appointments can only be cancelled up to 24 hours before the start"
      if (error instanceof ApiError && error.status === 404) {
        // The booking no longer exists on the server (e.g. after a database reset),
        // so forget it here too instead of keeping an appointment that can never be cancelled.
        removeMyBooking(booking.booking_id)
      }
    },
    onSettled: () => {
      // Success or failure: refresh the calendar and the list, then close.
      queryClient.invalidateQueries({ queryKey: ['slots'] })
      queryClient.invalidateQueries({ queryKey: MY_BOOKINGS_KEY })
      onClose()
    },
  })

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
          <AlertDialogDescription>
            {booking.service_name} with {booking.doctor_name} on {formatSlotDate(booking.start_at)} at{' '}
            {formatTime(booking.start_at)} will be cancelled, and the time becomes available to others.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Keep it</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Cancelling…' : 'Cancel appointment'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default CancelBookingDialog

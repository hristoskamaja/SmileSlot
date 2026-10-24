import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, createBooking } from '@/api/client'
import BookingConfirmation from '@/components/BookingConfirmation'
import BookingForm, { type BookingFormValues } from '@/components/BookingForm'
import BookingSummary from '@/components/BookingSummary'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { MY_BOOKINGS_KEY, saveMyBooking } from '@/lib/myBookings'
import type { Booking, Doctor, Slot } from '@/types'

type Props = {
  slot: Slot
  doctor: Doctor
  serviceName: string
  onClose: () => void
}

// The page only renders this component while a slot is selected, so it is always open.
// It starts fresh each time because the page mounts it anew for every selected slot.
function BookingDialog({ slot, doctor, serviceName, onClose }: Props) {
  const queryClient = useQueryClient()
  // Set after a successful booking; its presence switches the dialog to the confirmation view.
  const [booking, setBooking] = useState<Booking | null>(null)

  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (newBooking) => {
      setBooking(newBooking)
      // Remember it in this browser (there is no login) and refresh everything that shows "my bookings".
      saveMyBooking({
        slot_id: slot.id,
        start_at: slot.start_at,
        duration_minutes: slot.duration_minutes,
        doctor_name: doctor.name,
        service_name: serviceName,
        patient_name: newBooking.patient_name,
        booking_id: newBooking.id,
        cancel_token: newBooking.cancel_token, // what lets this browser cancel it later
      })
      queryClient.invalidateQueries({ queryKey: MY_BOOKINGS_KEY })
      // Refetch the week so the slot shows as Booked in the grid behind the dialog.
      queryClient.invalidateQueries({ queryKey: ['slots'] })
    },
    onError: (error) => {
      toast.error(error.message)
      if (error instanceof ApiError && error.status === 409) {
        // Someone else got the slot first: show the up-to-date week and close the dialog.
        queryClient.invalidateQueries({ queryKey: ['slots'] })
        onClose()
      }
    },
  })

  function handleSubmit(values: BookingFormValues) {
    mutation.mutate({
      slot_id: slot.id,
      patient_name: values.patient_name,
      patient_email: values.patient_email,
      patient_phone: values.patient_phone || undefined, // an empty phone is not sent
      note: values.note.trim() || undefined, // an empty note is not sent
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto rounded-3xl p-6 sm:max-w-[600px] sm:p-8">
        {booking ? (
          <BookingConfirmation booking={booking} slot={slot} doctor={doctor} serviceName={serviceName} onClose={onClose} />
        ) : (
          <>
            <DialogTitle className="text-2xl font-bold">Book appointment</DialogTitle>
            <BookingSummary slot={slot} doctor={doctor} serviceName={serviceName} />
            <BookingForm isPending={mutation.isPending} onSubmit={handleSubmit} />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default BookingDialog

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteSlot } from '@/api/client'
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
import { formatSlotDate, formatTime } from '@/lib/slots'
import type { Slot } from '@/types'

type Props = {
  slot: Slot
  serviceName: string
  onClose: () => void
}

// Asks "are you sure?" before deleting an available slot.
// Like the booking dialog, the page only renders it while a slot is selected.
function DeleteSlotDialog({ slot, serviceName, onClose }: Props) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => deleteSlot(slot.id),
    onSuccess: () => toast.success('Slot deleted'),
    onError: (error) => toast.error(error.message), // e.g. 409 if it was booked in the meantime
    onSettled: () => {
      // Success or failure, show the week as it really is now, then close.
      queryClient.invalidateQueries({ queryKey: ['slots'] })
      onClose()
    },
  })

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this slot?</AlertDialogTitle>
          <AlertDialogDescription>
            {serviceName} on {formatSlotDate(slot.start_at)} at {formatTime(slot.start_at)} will be removed. This
            can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteSlotDialog

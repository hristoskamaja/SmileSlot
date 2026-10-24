import { CircleCheck, Heart } from 'lucide-react'
import BookingSummary from '@/components/BookingSummary'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { Booking, Doctor, Slot } from '@/types'

type Props = {
  booking: Booking
  slot: Slot
  doctor: Doctor
  serviceName: string
  onClose: () => void
}

type MessageBlock = { type: 'paragraph'; text: string } | { type: 'bullets'; items: string[] }

// Turns the message text into paragraphs and bullet lists.
// A line starting with "- " is a bullet; neighbouring bullets are grouped into one list.
function parseMessage(text: string): MessageBlock[] {
  const blocks: MessageBlock[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('- ')) {
      const last = blocks[blocks.length - 1]
      if (last?.type === 'bullets') last.items.push(trimmed.slice(2))
      else blocks.push({ type: 'bullets', items: [trimmed.slice(2)] })
    } else {
      blocks.push({ type: 'paragraph', text: trimmed })
    }
  }
  return blocks
}

function BookingConfirmation({ booking, slot, doctor, serviceName, onClose }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <CircleCheck className="size-16 text-primary" strokeWidth={1.5} aria-hidden />
        <DialogTitle className="text-2xl font-bold">You're booked!</DialogTitle>
        <DialogDescription className="text-base">Your appointment is confirmed.</DialogDescription>
      </div>

      <BookingSummary slot={slot} doctor={doctor} serviceName={serviceName} />

      <div
        className="space-y-3 rounded-2xl border p-5 text-base"
        style={{ backgroundColor: 'var(--message-bg)', borderColor: 'var(--message-border)' }}
      >
        <h3 className="flex items-center gap-2 font-semibold">
          <Heart className="size-5" aria-hidden />
          A message for you
        </h3>
        {parseMessage(booking.ai_message).map((block, index) =>
          block.type === 'paragraph' ? (
            <p key={index}>{block.text}</p>
          ) : (
            <ul key={index} className="space-y-2">
              {block.items.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          ),
        )}
      </div>

      {/* Both buttons close the dialog; "Book another" just invites picking the next slot. */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose} className="h-14 flex-1 rounded-full text-base font-semibold">
          Done
        </Button>
        <Button onClick={onClose} className="h-14 flex-1 rounded-full text-base font-semibold">
          Book another
        </Button>
      </div>
    </div>
  )
}

export default BookingConfirmation

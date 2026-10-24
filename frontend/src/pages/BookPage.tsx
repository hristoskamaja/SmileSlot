import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { addWeeks } from 'date-fns'
import { getDoctors, getServices, getSlots } from '@/api/client'
import BookingDialog from '@/components/BookingDialog'
import DoctorSelect from '@/components/DoctorSelect'
import ServiceChips from '@/components/ServiceChips'
import SlotCalendar from '@/components/SlotCalendar'
import { Skeleton } from '@/components/ui/skeleton'
import WeekNav from '@/components/WeekNav'
import { currentWeekStart, dayKey, weekDays } from '@/lib/slots'
import { hasSeenTour, startTour } from '@/lib/tour'
import type { Slot } from '@/types'

function BookPage() {
  const [weekStart, setWeekStart] = useState(currentWeekStart)
  const [serviceId, setServiceId] = useState<number | null>(null)
  const [pickedDoctorId, setPickedDoctorId] = useState<number | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null) // the slot in the booking dialog

  const doctorsQuery = useQuery({ queryKey: ['doctors'], queryFn: getDoctors })
  const servicesQuery = useQuery({ queryKey: ['services'], queryFn: getServices })

  const doctors = doctorsQuery.data
  const services = servicesQuery.data
  // Until the patient picks someone, the first doctor is selected.
  const doctorId = pickedDoctorId ?? doctors?.[0]?.id

  const slotsQuery = useQuery({
    queryKey: ['slots', doctorId, dayKey(weekStart), serviceId],
    queryFn: () => getSlots(doctorId!, dayKey(weekStart), serviceId ?? undefined),
    enabled: doctorId !== undefined, // wait until the doctors have loaded
  })

  // Show the tour on the first visit.
  useEffect(() => {
    if (!hasSeenTour()) startTour()
  }, [])

  const days = weekDays(weekStart)
  const error = doctorsQuery.error ?? servicesQuery.error ?? slotsQuery.error
  const loading = !error && (!doctors || !services || slotsQuery.isPending)

  function retry() {
    doctorsQuery.refetch()
    servicesQuery.refetch()
    slotsQuery.refetch()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Book your visit</h1>
        <p className="mt-1 text-lg text-muted-foreground">Choose a doctor and tap any colored time to book.</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {doctors && doctorId !== undefined ? (
          <DoctorSelect doctors={doctors} selectedId={doctorId} onChange={setPickedDoctorId} />
        ) : (
          <Skeleton className="h-[66px] w-80 rounded-2xl" />
        )}
        {services && <ServiceChips services={services} selectedId={serviceId} onChange={setServiceId} />}
        <div className="lg:ml-auto">
          <WeekNav
            weekStart={weekStart}
            onPrevious={() => setWeekStart(addWeeks(weekStart, -1))}
            onToday={() => setWeekStart(currentWeekStart())}
            onNext={() => setWeekStart(addWeeks(weekStart, 1))}
          />
        </div>
      </div>

      <SlotCalendar
        slots={slotsQuery.data}
        services={services}
        days={days}
        loading={loading}
        error={error}
        onRetry={retry}
        mode="book"
        onSelect={setSelectedSlot}
        onNextWeek={() => setWeekStart(addWeeks(weekStart, 1))}
      />

      {selectedSlot && doctors && services && (
        <BookingDialog
          key={selectedSlot.id}
          slot={selectedSlot}
          doctor={doctors.find((d) => d.id === selectedSlot.doctor_id)!}
          serviceName={services.find((s) => s.id === selectedSlot.service_id)?.name ?? 'Appointment'}
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </div>
  )
}

export default BookPage

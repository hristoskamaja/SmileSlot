import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { addWeeks } from 'date-fns'
import { getDoctors, getServices, getSlots } from '@/api/client'
import AddSlotForm from '@/components/AddSlotForm'
import BookingDetailsDialog from '@/components/BookingDetailsDialog'
import DeleteSlotDialog from '@/components/DeleteSlotDialog'
import DoctorSelect from '@/components/DoctorSelect'
import SlotCalendar from '@/components/SlotCalendar'
import StatsRow from '@/components/StatsRow'
import { Skeleton } from '@/components/ui/skeleton'
import WeekNav from '@/components/WeekNav'
import { currentWeekStart, dayKey, weekDays } from '@/lib/slots'
import { hasSeenTour, startTour } from '@/lib/tour'
import { useDefaultWeek } from '@/lib/useDefaultWeek'
import type { Slot } from '@/types'

function ClinicPage() {
  const [weekStart, setWeekStart] = useState(currentWeekStart)
  const [pickedDoctorId, setPickedDoctorId] = useState<number | null>(null)
  const [slotToDelete, setSlotToDelete] = useState<Slot | null>(null) // the slot in the delete confirm
  const [slotToView, setSlotToView] = useState<Slot | null>(null) // the booked slot in the details dialog

  const doctorsQuery = useQuery({ queryKey: ['doctors'], queryFn: getDoctors })
  const servicesQuery = useQuery({ queryKey: ['services'], queryFn: getServices })

  const doctors = doctorsQuery.data
  const services = servicesQuery.data
  const doctorId = pickedDoctorId ?? doctors?.[0]?.id

  // The clinic sees every service, so there is no service filter here.
  const slotsQuery = useQuery({
    queryKey: ['slots', doctorId, dayKey(weekStart), null],
    queryFn: () => getSlots(doctorId!, dayKey(weekStart)),
    enabled: doctorId !== undefined,
  })

  useDefaultWeek(weekStart, setWeekStart, slotsQuery.data)

  // Show the tour on the first visit.
  useEffect(() => {
    if (!hasSeenTour('clinic')) startTour('clinic')
  }, [])

  const days = weekDays(weekStart)
  const error = doctorsQuery.error ?? servicesQuery.error ?? slotsQuery.error
  const loading = !error && (!doctors || !services || slotsQuery.isPending)

  function retry() {
    doctorsQuery.refetch()
    servicesQuery.refetch()
    slotsQuery.refetch()
  }

  // A booked slot shows its details; any other slot (available or busy) can be deleted.
  function handleSelect(slot: Slot) {
    if (slot.status === 'booked') setSlotToView(slot)
    else setSlotToDelete(slot)
  }

  const serviceName = (slot: Slot) => services?.find((s) => s.id === slot.service_id)?.name ?? 'Appointment'
  const viewedDoctor = doctors?.find((d) => d.id === slotToView?.doctor_id)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clinic schedule</h1>
          <p className="mt-1 text-lg text-muted-foreground">Open new times and see who's coming in.</p>
        </div>
        {doctors && doctorId !== undefined ? (
          <DoctorSelect doctors={doctors} selectedId={doctorId} onChange={setPickedDoctorId} />
        ) : (
          <Skeleton className="h-[66px] w-80 rounded-2xl" />
        )}
      </div>

      <StatsRow slots={slotsQuery.data} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {services && doctorId !== undefined ? (
          <AddSlotForm doctorId={doctorId} services={services} />
        ) : (
          <Skeleton className="h-[560px] rounded-2xl" />
        )}

        <div className="space-y-4">
          <WeekNav
            weekStart={weekStart}
            onPrevious={() => setWeekStart(addWeeks(weekStart, -1))}
            onToday={() => setWeekStart(currentWeekStart())}
            onNext={() => setWeekStart(addWeeks(weekStart, 1))}
          />
          <SlotCalendar
            slots={slotsQuery.data}
            services={services}
            days={days}
            loading={loading}
            error={error}
            onRetry={retry}
            mode="clinic"
            onSelect={handleSelect}
          />
        </div>
      </div>

      {slotToDelete && services && (
        <DeleteSlotDialog
          key={slotToDelete.id}
          slot={slotToDelete}
          serviceName={serviceName(slotToDelete)}
          onClose={() => setSlotToDelete(null)}
        />
      )}

      {slotToView && viewedDoctor && (
        <BookingDetailsDialog
          key={slotToView.id}
          slot={slotToView}
          doctor={viewedDoctor}
          serviceName={serviceName(slotToView)}
          onClose={() => setSlotToView(null)}
        />
      )}
    </div>
  )
}

export default ClinicPage

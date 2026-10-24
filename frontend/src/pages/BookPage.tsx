import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { addWeeks } from 'date-fns'
import { CalendarX, TriangleAlert } from 'lucide-react'
import { getDoctors, getServices, getSlots } from '@/api/client'
import DayList from '@/components/DayList'
import DoctorSelect from '@/components/DoctorSelect'
import Legend from '@/components/Legend'
import ServiceChips from '@/components/ServiceChips'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import WeekGrid from '@/components/WeekGrid'
import WeekNav from '@/components/WeekNav'
import { currentWeekStart, dayKey, weekDays } from '@/lib/slots'

// Shown instead of the grid when there is nothing to show or something went wrong.
function Message({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-16 text-center shadow-sm">
      <div className="text-muted-foreground">{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  )
}

function BookPage() {
  const [weekStart, setWeekStart] = useState(currentWeekStart)
  const [serviceId, setServiceId] = useState<number | null>(null)
  const [pickedDoctorId, setPickedDoctorId] = useState<number | null>(null)

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

  const days = weekDays(weekStart)
  const error = doctorsQuery.error ?? servicesQuery.error ?? slotsQuery.error
  const loading = !error && (!doctors || !services || slotsQuery.isPending)

  function retry() {
    doctorsQuery.refetch()
    servicesQuery.refetch()
    slotsQuery.refetch()
  }

  function renderCalendar() {
    if (error) {
      return (
        <Message icon={<TriangleAlert className="size-10" />} title="Something went wrong">
          <p className="text-muted-foreground">{error.message}</p>
          <Button onClick={retry}>Retry</Button>
        </Message>
      )
    }
    if (loading) {
      return <Skeleton className="h-[640px] rounded-2xl" aria-label="Loading slots" />
    }
    if (slotsQuery.data!.length === 0) {
      return (
        <Message icon={<CalendarX className="size-10" />} title="No free slots this week — try next week">
          <Button onClick={() => setWeekStart(addWeeks(weekStart, 1))}>Go to next week</Button>
        </Message>
      )
    }
    return (
      <>
        <div className="hidden md:block">
          <WeekGrid days={days} slots={slotsQuery.data!} services={services!} />
        </div>
        <div className="md:hidden">
          <DayList days={days} slots={slotsQuery.data!} services={services!} />
        </div>
        <div className="mt-4">
          <Legend services={services!} />
        </div>
      </>
    )
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

      {renderCalendar()}
    </div>
  )
}

export default BookPage

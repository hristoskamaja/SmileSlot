function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
      <li className="flex items-center gap-2">
        <span className="size-4 rounded border border-emerald-300 bg-emerald-100" aria-hidden />
        Available (color shows the service)
      </li>
      <li className="flex items-center gap-2">
        <span className="booked-stripes size-4 rounded border" aria-hidden />
        Booked
      </li>
      <li className="flex items-center gap-2">
        <span className="size-4 rounded border border-emerald-300 bg-emerald-100 opacity-50" aria-hidden />
        Past
      </li>
    </ul>
  )
}

export default Legend

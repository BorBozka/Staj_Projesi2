import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Visit } from "@/domain/visits"
import { VisitStatusBadge } from "@/features/visits/VisitStatusBadge"
import { visitStatusAccents, visitStatusSurfaces } from "@/features/visits/visit-status-styles"
import { formatTr } from "@/lib/date"
import { cn } from "@/lib/utils"

export type TimelineView = "day" | "week" | "month"

const timelineStartHour = 8
const timelineEndHour = 18

interface Props {
  visits: Visit[]
  view: TimelineView
  selectedDate: Date
  onViewChange(view: TimelineView): void
  onSelectedDateChange(date: Date): void
  onVisitOpen(visit: Visit): void
  onNewVisit(): void
}

const viewLabels: Record<TimelineView, string> = {
  day: "Gün",
  week: "Hafta",
  month: "Ay",
}

export function VisitTimeline({ visits, view, selectedDate, onViewChange, onSelectedDateChange, onVisitOpen, onNewVisit }: Props) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const visibleVisits = visits.filter((visit) => {
    const date = new Date(visit.plannedStart)
    if (view === "day") return isSameDay(date, selectedDate)
    if (view === "week") {
      return isWithinInterval(date, {
        start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
      })
    }
    return isSameMonth(date, selectedDate)
  })

  const move = (direction: -1 | 1) => {
    const amount = direction
    onSelectedDateChange(
      view === "day" ? addDays(selectedDate, amount) : view === "week" ? addWeeks(selectedDate, amount) : addMonths(selectedDate, amount),
    )
  }

  const title =
    view === "day"
      ? formatTr(selectedDate, "d MMMM yyyy EEEE")
      : view === "week"
        ? `${formatTr(startOfWeek(selectedDate, { weekStartsOn: 1 }), "d MMM")} – ${formatTr(endOfWeek(selectedDate, { weekStartsOn: 1 }), "d MMM yyyy")}`
        : formatTr(selectedDate, "MMMM yyyy")

  return (
    <section className="overflow-hidden rounded-lg border bg-card shadow-panel" aria-label="Ziyaret Takvimi">
      <div className="flex flex-col gap-1.5 border-b px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Ziyaret Takvimi</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {visibleVisits.length} ziyaret
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{title}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button size="sm" onClick={onNewVisit}><CalendarPlus />Yeni Ziyaret</Button>
          <div className="inline-flex rounded-md border bg-slate-50 p-0.5" aria-label="Takvim görünümü">
            {(["day", "week", "month"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onViewChange(item)}
                className={cn(
                  "h-[26px] rounded px-2.5 text-xs font-medium transition-colors",
                  view === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900",
                )}
                aria-pressed={view === item}
              >
                {viewLabels[item]}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => onSelectedDateChange(new Date())}>Bugün</Button>
          <div className="flex">
            <Button variant="outline" size="icon-sm" className="rounded-r-none" onClick={() => move(-1)} aria-label={`Önceki ${viewLabels[view].toLocaleLowerCase("tr-TR")}`}><ChevronLeft /></Button>
            <Button variant="outline" size="icon-sm" className="-ml-px rounded-l-none" onClick={() => move(1)} aria-label={`Sonraki ${viewLabels[view].toLocaleLowerCase("tr-TR")}`}><ChevronRight /></Button>
          </div>
        </div>
      </div>

      {view === "month" ? (
        <MonthTimeline visits={visits} selectedDate={selectedDate} onVisitOpen={onVisitOpen} />
      ) : (
        <LaneTimeline visits={visibleVisits} selectedDate={selectedDate} view={view} now={now} onVisitOpen={onVisitOpen} />
      )}

      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t bg-slate-50/70 px-3 py-1.5">
        {(["PLANNED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"] as const).map((status) => (
          <VisitStatusBadge key={status} status={status} compact />
        ))}
      </div>
    </section>
  )
}

function LaneTimeline({ visits, selectedDate, view, now, onVisitOpen }: { visits: Visit[]; selectedDate: Date; view: "day" | "week"; now: Date; onVisitOpen(visit: Visit): void }) {
  const hours = Array.from({ length: timelineEndHour - timelineStartHour + 1 }, (_, index) => timelineStartHour + index)

  if (view === "day") {
    const agendaVisits = layoutDayVisits(visits)

    return (
      <div
        className="grid grid-cols-[52px_minmax(0,1fr)] border-b"
        style={{ height: "clamp(472px, calc(100vh - 228px), 632px)" }}
      >
        <div className="relative border-r bg-slate-50/70" aria-hidden="true">
          {hours.map((hour, index) => (
            <span
              key={hour}
              className="absolute right-1.5 text-[10px] font-medium tabular-nums text-muted-foreground"
              style={dayHourLabelPosition(index, hours.length)}
            >
              {String(hour).padStart(2, "0")}:00
            </span>
          ))}
        </div>
        <div className="relative overflow-hidden bg-white" aria-label="Günlük ziyaret gündemi">
          {hours.map((hour, index) => (
            <div
              key={hour}
              className="pointer-events-none absolute inset-x-0 border-t"
              style={{ top: `${(index / (hours.length - 1)) * 100}%` }}
              aria-hidden="true"
            />
          ))}
          {isSameDay(selectedDate, now) && <DayCurrentTimeIndicator now={now} />}
          {agendaVisits.map(({ visit, column, columnCount }) => (
            <DayVisitCard key={visit.id} visit={visit} column={column} columnCount={columnCount} onOpen={onVisitOpen} />
          ))}
          {agendaVisits.length === 0 && <EmptyTimelineOverlay />}
        </div>
      </div>
    )
  }

  const days = eachDayOfInterval({
    start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
    end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
  })

  return (
    <div className="flex w-full flex-col" style={{ height: "clamp(472px, calc(100vh - 228px), 632px)" }}>
      <TimeHeader hours={hours} label="Gün" />
      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col divide-y overflow-y-auto">
        {days.map((day) => {
          const dayVisits = visits.filter((visit) => isSameDay(new Date(visit.plannedStart), day))
          const height = Math.max(56, dayVisits.length * 33 + 8)
          return (
            <div key={day.toISOString()} className="grid grid-cols-[112px_minmax(0,1fr)]" style={{ minHeight: height }}>
              <div className={cn("border-r px-2.5 py-2.5", isSameDay(day, new Date()) && "bg-blue-50/60")}>
                <p className="truncate text-[13px] font-semibold">{formatTr(day, "EEEE")}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{formatTr(day, "d MMMM")}</p>
              </div>
              <div
                className="relative bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px)] bg-[length:10%_100%]"
                style={{ minHeight: height }}
              >
                {isSameDay(day, now) && <WeekCurrentTimeIndicator now={now} />}
                {dayVisits.map((visit, index) => <VisitBlock key={visit.id} visit={visit} top={5 + index * 33} onOpen={onVisitOpen} />)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TimeHeader({ hours, label }: { hours: number[]; label: string }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] border-b bg-slate-50/80">
      <div className="border-r px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <TimeAxis hours={hours} />
    </div>
  )
}

function TimeAxis({ hours }: { hours: number[] }) {
  return (
    <div className="relative h-7">
      {hours.map((hour, index) => (
        <span
          key={hour}
          className={cn(
            "absolute top-1.5 text-[9px] tabular-nums text-muted-foreground",
            index === 0 ? "translate-x-0" : index === hours.length - 1 ? "" : "-translate-x-1/2",
          )}
          style={index === hours.length - 1 ? { right: 8 } : { left: index === 0 ? 8 : `${(index / (hours.length - 1)) * 100}%` }}
        >
          {String(hour).padStart(2, "0")}:00
        </span>
      ))}
    </div>
  )
}

interface DayVisitLayout {
  visit: Visit
  column: number
  columnCount: number
}

function layoutDayVisits(visits: Visit[]): DayVisitLayout[] {
  const windowStart = timelineStartHour * 60
  const windowEnd = timelineEndHour * 60
  const visible = [...visits]
    .filter((visit) => visitEndMinutes(visit) > windowStart && visitStartMinutes(visit) < windowEnd)
    .sort((a, b) => a.plannedStart.localeCompare(b.plannedStart))
  const result: DayVisitLayout[] = []
  let group: Visit[] = []
  let groupEnd = Number.NEGATIVE_INFINITY

  const placeGroup = () => {
    if (group.length === 0) return
    const columnEnds: number[] = []
    const placed = group.map((visit) => {
      const start = visitStartMinutes(visit)
      let column = columnEnds.findIndex((end) => end <= start)
      if (column === -1) column = columnEnds.length
      columnEnds[column] = visitCollisionEndMinutes(visit)
      return { visit, column }
    })
    const columnCount = columnEnds.length
    result.push(...placed.map((item) => ({ ...item, columnCount })))
    group = []
    groupEnd = Number.NEGATIVE_INFINITY
  }

  visible.forEach((visit) => {
    const start = visitStartMinutes(visit)
    if (group.length > 0 && start >= groupEnd) placeGroup()
    group.push(visit)
    groupEnd = Math.max(groupEnd, visitCollisionEndMinutes(visit))
  })
  placeGroup()

  return result
}

function visitStartMinutes(visit: Visit) {
  const start = new Date(visit.plannedStart)
  return start.getHours() * 60 + start.getMinutes()
}

function visitEndMinutes(visit: Visit) {
  const end = new Date(visit.plannedEnd)
  return end.getHours() * 60 + end.getMinutes()
}

function visitCollisionEndMinutes(visit: Visit) {
  const duration = visitEndMinutes(visit) - visitStartMinutes(visit)
  return visitEndMinutes(visit) + (duration <= 60 ? 15 : 0)
}

function dayHourLabelPosition(index: number, hourCount: number) {
  if (index === 0) return { top: 4 }
  if (index === hourCount - 1) return { bottom: 4 }
  return { top: `${(index / (hourCount - 1)) * 100}%`, transform: "translateY(-50%)" }
}

function DayVisitCard({ visit, column, columnCount, onOpen }: { visit: Visit; column: number; columnCount: number; onOpen(visit: Visit): void }) {
  const start = new Date(visit.plannedStart)
  const end = new Date(visit.plannedEnd)
  const windowStart = timelineStartHour * 60
  const windowMinutes = (timelineEndHour - timelineStartHour) * 60
  const startMinutes = Math.max(windowStart, visitStartMinutes(visit))
  const endMinutes = Math.min(timelineEndHour * 60, visitEndMinutes(visit))
  const top = ((startMinutes - windowStart) / windowMinutes) * 100
  const height = ((endMinutes - startMinutes) / windowMinutes) * 100
  const width = 100 / columnCount
  const left = column * width
  const duration = visitEndMinutes(visit) - visitStartMinutes(visit)
  const minimumHeight = duration <= 30 ? 32 : duration < 60 ? 42 : duration === 60 ? 54 : undefined

  return (
    <button
      type="button"
      onClick={() => onOpen(visit)}
      className={cn(
        "group absolute z-[1] overflow-visible rounded border border-l-[3px] px-1.5 py-1 text-left shadow-sm transition-shadow hover:z-20 hover:shadow-md focus-visible:z-20",
        visitStatusSurfaces[visit.status],
        visitStatusAccents[visit.status],
        visit.status === "CANCELLED" && "border-dashed",
      )}
      style={{
        top: `${top}%`,
        height: `calc(${height}% - 2px)`,
        left: `calc(${left}% + 3px)`,
        width: `calc(${width}% - 6px)`,
        minHeight: minimumHeight,
      }}
      title={`${visit.visitor.firstName} ${visit.visitor.lastName} · ${formatTr(start, "HH:mm")}–${formatTr(end, "HH:mm")} · ${visit.visitTypeName}`}
    >
      <span className="block h-full overflow-hidden">
        {duration <= 30 ? (
          <span className={cn("block truncate text-[10px] font-semibold leading-4", visit.status === "CANCELLED" && "line-through")}>
            {visit.visitor.firstName} {visit.visitor.lastName} · {formatTr(start, "HH:mm")}–{formatTr(end, "HH:mm")}
          </span>
        ) : duration < 60 ? (
          <>
            <span className={cn("block truncate text-[10px] font-semibold leading-[14px]", visit.status === "CANCELLED" && "line-through")}>{visit.visitor.firstName} {visit.visitor.lastName}</span>
            <span className="block truncate text-[10px] leading-[14px] opacity-80">{formatTr(start, "HH:mm")}–{formatTr(end, "HH:mm")} · {visit.visitTypeName}</span>
          </>
        ) : (
          <>
            <span className={cn("block truncate text-[11px] font-semibold leading-4", visit.status === "CANCELLED" && "line-through")}>{visit.visitor.firstName} {visit.visitor.lastName}</span>
            <span className="block truncate text-[10px] leading-[13px] tabular-nums opacity-80">{formatTr(start, "HH:mm")}–{formatTr(end, "HH:mm")}</span>
            <span className="block truncate text-[10px] leading-[13px] opacity-80">{visit.visitTypeName}</span>
          </>
        )}
      </span>
      <VisitHoverTooltip visit={visit} />
    </button>
  )
}

function VisitBlock({ visit, top = 10, onOpen }: { visit: Visit; top?: number; onOpen(visit: Visit): void }) {
  const start = new Date(visit.plannedStart)
  const end = new Date(visit.plannedEnd)
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = end.getHours() * 60 + end.getMinutes()
  const windowStart = timelineStartHour * 60
  const windowMinutes = (timelineEndHour - timelineStartHour) * 60
  const left = Math.max(0, ((startMinutes - windowStart) / windowMinutes) * 100)
  const unclampedWidth = ((endMinutes - startMinutes) / windowMinutes) * 100
  const width = Math.min(100 - left, Math.max(6, unclampedWidth))

  return (
    <button
      type="button"
      onClick={() => onOpen(visit)}
      className={cn(
        "group absolute h-7 rounded border border-l-[3px] px-1.5 py-[3px] text-left shadow-sm transition-shadow hover:z-20 hover:shadow-md focus-visible:z-20",
        visitStatusSurfaces[visit.status],
        visitStatusAccents[visit.status],
        visit.status === "CANCELLED" && "border-dashed",
      )}
      style={{ left: `${left}%`, width: `${width}%`, top }}
      title={`${visit.visitor.firstName} ${visit.visitor.lastName} · ${formatTr(start, "HH:mm")}–${formatTr(end, "HH:mm")} · ${visit.visitTypeName}`}
    >
      <span className="block overflow-hidden">
        <span className={cn("block truncate text-[10px] font-semibold leading-[11px]", visit.status === "CANCELLED" && "line-through")}>
          {visit.visitor.firstName} {visit.visitor.lastName}
        </span>
        <span className="block truncate text-[10px] leading-[11px] opacity-80">{formatTr(start, "HH:mm")}–{formatTr(end, "HH:mm")}</span>
      </span>
      <VisitHoverTooltip visit={visit} />
    </button>
  )
}

function WeekCurrentTimeIndicator({ now }: { now: Date }) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const windowStart = timelineStartHour * 60
  const windowMinutes = (timelineEndHour - timelineStartHour) * 60
  if (currentMinutes < windowStart || currentMinutes > timelineEndHour * 60) return null

  const left = ((currentMinutes - windowStart) / windowMinutes) * 100
  return (
    <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-rose-500/80" style={{ left: `${left}%` }} aria-hidden="true">
      <span className="absolute left-1/2 top-1 -translate-x-1/2 rounded bg-rose-600 px-1 py-0.5 text-[9px] font-semibold leading-none text-white shadow-sm">
        Şimdi
      </span>
    </div>
  )
}

function DayCurrentTimeIndicator({ now }: { now: Date }) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const windowStart = timelineStartHour * 60
  const windowMinutes = (timelineEndHour - timelineStartHour) * 60
  if (currentMinutes < windowStart || currentMinutes > timelineEndHour * 60) return null

  const top = ((currentMinutes - windowStart) / windowMinutes) * 100
  return (
    <div className="pointer-events-none absolute inset-x-0 z-10 h-px bg-rose-500/90" style={{ top: `${top}%` }} aria-hidden="true">
      <span className="absolute left-1 top-0 -translate-y-1/2 rounded bg-rose-600 px-1 py-0.5 text-[9px] font-semibold leading-none text-white shadow-sm">
        Şimdi
      </span>
    </div>
  )
}

function VisitHoverTooltip({ visit }: { visit: Visit }) {
  const start = new Date(visit.plannedStart)
  const end = new Date(visit.plannedEnd)
  return (
    <span
      role="tooltip"
      className="pointer-events-none invisible absolute right-0 top-full z-50 mt-1 w-56 rounded-md bg-slate-950 px-2.5 py-2 text-left text-[11px] leading-4 text-white opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100"
    >
      <span className="block font-semibold">{visit.visitor.firstName} {visit.visitor.lastName}</span>
      <span className="block text-slate-300">{visit.visitTypeName}</span>
      <span className="block tabular-nums text-slate-300">{formatTr(start, "HH:mm")}–{formatTr(end, "HH:mm")}</span>
    </span>
  )
}

function MonthTimeline({ visits, selectedDate, onVisitOpen }: { visits: Visit[]; selectedDate: Date; onVisitOpen(visit: Visit): void }) {
  const interval = {
    start: startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 }),
  }
  const days = eachDayOfInterval(interval)
  const weekCount = days.length / 7

  return (
    <div className="overflow-x-auto scrollbar-thin" style={{ height: "clamp(472px, calc(100vh - 228px), 632px)" }}>
      <div className="flex h-full min-w-[760px] flex-col">
        <div className="grid grid-cols-7 border-b bg-slate-50/80">
          {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => (
            <div key={day} className="border-r px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground last:border-r-0">{day}</div>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-7" style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}>
          {days.map((day) => {
            const dayVisits = visits.filter((visit) => isSameDay(new Date(visit.plannedStart), day))
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-0 overflow-hidden border-b border-r p-1.5 last:border-r-0",
                  !isSameMonth(day, selectedDate) && "bg-slate-50/70 text-muted-foreground",
                )}
              >
                <div className={cn("mb-1 flex size-[22px] items-center justify-center rounded-full text-[11px] font-medium", isSameDay(day, new Date()) && "bg-primary text-primary-foreground")}>
                  {formatTr(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayVisits.slice(0, 2).map((visit) => (
                    <button type="button" onClick={() => onVisitOpen(visit)} key={visit.id} className={cn("group relative block w-full rounded border border-l-[3px] px-1.5 py-0.5 text-left text-[10px]", visitStatusSurfaces[visit.status], visitStatusAccents[visit.status])} title={`${visit.visitor.firstName} ${visit.visitor.lastName}`}>
                      <p className={cn("truncate font-semibold", visit.status === "CANCELLED" && "line-through")}>{formatTr(new Date(visit.plannedStart), "HH:mm")} · {visit.visitor.firstName} {visit.visitor.lastName}</p>
                    </button>
                  ))}
                  {dayVisits.length > 2 && (
                    <MonthOverflowMenu day={day} visits={dayVisits.slice(2)} onVisitOpen={onVisitOpen} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MonthOverflowMenu({ day, visits, onVisitOpen }: { day: Date; visits: Visit[]; onVisitOpen(visit: Visit): void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded px-1 py-0.5 text-[10px] font-semibold text-primary hover:bg-blue-50 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${formatTr(day, "d MMMM")} günü için ${visits.length} ek ziyareti göster`}
        >
          +{visits.length} ziyaret
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4} collisionPadding={8} className="w-64 p-0">
        <div className="border-b px-2.5 py-2">
          <p className="text-xs font-semibold">{formatTr(day, "d MMMM")}</p>
          <p className="text-[10px] text-muted-foreground">{visits.length} ek ziyaret</p>
        </div>
        <div className="scrollbar-thin max-h-56 overflow-y-auto p-1">
          {visits.map((visit) => (
            <DropdownMenuItem
              key={visit.id}
              onSelect={() => onVisitOpen(visit)}
              className="flex items-center gap-2 px-2 py-1.5 text-xs"
            >
              <span className="w-9 shrink-0 tabular-nums text-muted-foreground">
                {formatTr(new Date(visit.plannedStart), "HH:mm")}
              </span>
              <span className={cn("truncate font-medium", visit.status === "CANCELLED" && "line-through")}>
                {visit.visitor.firstName} {visit.visitor.lastName}
              </span>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EmptyTimelineOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="rounded-md border bg-white px-4 py-3 text-center shadow-sm">
        <p className="text-[13px] font-medium">Planlanmış ziyaret yok</p>
        <p className="mt-1 text-xs text-muted-foreground">Başka bir tarih seçin veya yeni bir ziyaret oluşturun.</p>
      </div>
    </div>
  )
}

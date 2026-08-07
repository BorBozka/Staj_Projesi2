import { isAfter, startOfDay } from "date-fns"
import { CalendarDays, UserRound } from "lucide-react"

import type { Visit } from "@/domain/visits"
import { VisitActions } from "@/features/visits/VisitActions"
import { VisitStatusBadge } from "@/features/visits/VisitStatusBadge"
import { formatTr } from "@/lib/date"

interface Props {
  visits: Visit[]
  onView(visit: Visit): void
  onEdit(visit: Visit): void
  onReschedule(visit: Visit): void
  onCancel(visit: Visit): void
}

export function UpcomingVisits({ visits, onView, onEdit, onReschedule, onCancel }: Props) {
  const upcoming = visits
    .filter((visit) => visit.status === "PLANNED" && isAfter(new Date(visit.plannedEnd), startOfDay(new Date())))
    .sort((a, b) => a.plannedStart.localeCompare(b.plannedStart))

  return (
    <section className="overflow-hidden rounded-lg border bg-card shadow-panel" aria-labelledby="upcoming-title">
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <div>
          <h2 id="upcoming-title" className="text-sm font-semibold">Yaklaşan Ziyaretler</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Sıradaki planlı ziyaretleriniz</p>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{upcoming.length}</span>
      </div>

      {upcoming.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">Yaklaşan ziyaret bulunmuyor.</p>
      ) : (
        <div className="max-h-[min(468px,calc(100vh-150px))] divide-y overflow-y-auto scrollbar-thin">
          {upcoming.map((visit) => (
            <article key={visit.id} className="group px-3 py-2.5 hover:bg-slate-50/70">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => onView(visit)} className="truncate text-left text-[13px] font-semibold hover:text-primary hover:underline">
                      {visit.visitor.firstName} {visit.visitor.lastName}
                    </button>
                    <VisitStatusBadge status={visit.status} compact />
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{visit.visitTypeName}</p>
                </div>
                <VisitActions visit={visit} onView={onView} onEdit={onEdit} onReschedule={onReschedule} onCancel={onCancel} />
              </div>
              <div className="mt-2 space-y-1 text-xs leading-[18px] text-slate-600">
                <div className="flex items-start gap-1.5"><CalendarDays className="mt-0.5 size-3.5 shrink-0 text-slate-400" /><span>{formatTr(new Date(visit.plannedStart), "d MMMM EEEE · HH:mm")}–{formatTr(new Date(visit.plannedEnd), "HH:mm")}</span></div>
                <div className="flex min-w-0 items-start gap-1.5"><UserRound className="mt-0.5 size-3.5 shrink-0 text-slate-400" /><span>{visit.hostEmployeeName} · {visit.hostCompanyName} / {visit.facilityName}</span></div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

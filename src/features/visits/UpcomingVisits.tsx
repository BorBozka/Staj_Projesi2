import { CalendarDays, MapPin } from "lucide-react"
import { useEffect, useState } from "react"

import type { Visit } from "@/domain/visits"
import { VisitStatusBadge } from "@/features/visits/VisitStatusBadge"
import { getUpcomingVisits } from "@/features/visits/upcoming-visits"
import { formatTr } from "@/lib/date"

interface Props {
  visits: Visit[]
  onView(visit: Visit): void
  currentFacilityId?: string
}

export function UpcomingVisits({ visits, onView, currentFacilityId }: Props) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const upcoming = getUpcomingVisits(visits, now)

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-panel xl:min-h-0" aria-labelledby="upcoming-title">
      <div className="shrink-0 flex items-center justify-between border-b px-3 py-2.5">
        <h2 id="upcoming-title" className="text-sm font-semibold">Yaklaşan Ziyaretler</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{upcoming.length}</span>
      </div>

      {upcoming.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">Yaklaşan ziyaret bulunmuyor.</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {upcoming.map((visit, index) => (
            <button
              key={visit.id}
              type="button"
              onClick={() => onView(visit)}
              className={`group block w-full px-3 py-2.5 text-left transition-colors hover:bg-blue-50 hover:shadow-[inset_3px_0_0_hsl(var(--primary))] focus-visible:relative focus-visible:z-10 focus-visible:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${index === upcoming.length - 1 ? "border-b" : ""}`}
              aria-label={`${visit.visitor.firstName} ${visit.visitor.lastName} ziyaret detaylarını aç`}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[13px] font-semibold transition-colors group-hover:text-primary group-focus-visible:text-primary">{visit.visitor.firstName} {visit.visitor.lastName}</span>
                    <VisitStatusBadge status={visit.status} compact />
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{visit.visitTypeName}</p>
                </div>
              </div>
              <div className="mt-1.5 space-y-1 text-xs leading-[18px] text-slate-600">
                <div className="flex items-start gap-1.5"><CalendarDays className="mt-0.5 size-3.5 shrink-0 text-slate-400" /><span>{formatTr(new Date(visit.plannedStart), "d MMMM EEEE · HH:mm")}–{formatTr(new Date(visit.plannedEnd), "HH:mm")}</span></div>
                {currentFacilityId && visit.facilityId !== currentFacilityId && (
                  <div className="flex min-w-0 items-start gap-1.5 text-slate-700"><MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" /><span><span className="font-medium">Farklı tesis:</span> {visit.facilityName}</span></div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

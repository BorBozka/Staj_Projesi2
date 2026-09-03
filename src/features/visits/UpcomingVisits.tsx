import { Clock3, MapPin, Search, X } from "lucide-react"
import { useEffect, useState } from "react"

import type { Visit } from "@/domain/visits"
import { formatUpcomingVisitTypeLine, getNonCancelledUpcomingVisits, getUpcomingVisitDayGroups, getUpcomingVisitRelativeTime, getUpcomingVisits } from "@/features/visits/upcoming-visits"
import { searchVisits } from "@/features/visits/visit-search"
import { formatTr } from "@/lib/date"
import { shouldShowDifferentFacility } from "@/lib/facility-visibility"

interface Props {
  visits: Visit[]
  onView(visit: Visit): void
  currentFacilityId?: string
  /** Shows a search box that looks across every visit the viewer owns, past ones included. */
  searchable?: boolean
}

export function UpcomingVisits({ visits, onView, currentFacilityId, searchable = false }: Props) {
  const [now, setNow] = useState(() => new Date())
  const [query, setQuery] = useState("")

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const isSearching = searchable && query.trim().length > 0
  const visibleVisits = getNonCancelledUpcomingVisits(visits)
  const listed = isSearching ? searchVisits(visibleVisits, query, now) : getUpcomingVisits(visibleVisits, now)
  const dayGroups = getUpcomingVisitDayGroups(listed, now)

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-panel xl:min-h-0" aria-labelledby="upcoming-title">
      <div className="shrink-0 space-y-2 border-b px-3 py-2.5">
        <div className="flex items-center justify-between">
          <h2 id="upcoming-title" className="text-sm font-semibold">{isSearching ? "Arama Sonuçları" : "Yaklaşan Ziyaretler"}</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{listed.length}</span>
        </div>
        {searchable && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tüm ziyaretlerimde ara"
              aria-label="Tüm ziyaretlerimde ara"
              className="h-8 w-full rounded-md border bg-white pl-8 pr-7 text-xs placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Aramayı temizle"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {listed.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
          {isSearching ? `"${query.trim()}" için ziyaret bulunamadı.` : "Yaklaşan ziyaret bulunmuyor."}
        </p>
      ) : (
        <div className="relative isolate min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {dayGroups.map((group) => (
            <section key={group.visits[0].id} aria-label={group.label}>
              <h3 className="sticky top-0 z-20 bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-500">{group.label}</h3>
              {group.visits.map((visit) => {
                const timeRange = `${formatTr(new Date(visit.plannedStart), "HH:mm")}–${formatTr(new Date(visit.plannedEnd), "HH:mm")}`
                const relativeTime = getUpcomingVisitRelativeTime(visit.plannedStart, now)
                const scheduleLabel = relativeTime ? `${relativeTime} · ${timeRange}` : timeRange
                const typeLine = formatUpcomingVisitTypeLine(visit.visitTypeName, visit.visitor.company)

                return (
                  <button
                    key={visit.id}
                    type="button"
                    onClick={() => onView(visit)}
                    className="group block w-full border-b border-slate-200 px-3 py-2.5 text-left transition-colors hover:bg-blue-50 hover:shadow-[inset_3px_0_0_hsl(var(--primary))] focus-visible:relative focus-visible:z-10 focus-visible:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    aria-label={`${visit.visitor.firstName} ${visit.visitor.lastName} ziyaret detaylarını aç`}
                  >
                    <div className="min-w-0">
                      <span className="block min-w-0 truncate text-[13px] font-semibold transition-colors group-hover:text-primary group-focus-visible:text-primary" title={`${visit.visitor.firstName} ${visit.visitor.lastName}`}>{visit.visitor.firstName} {visit.visitor.lastName}</span>
                      <p className="mt-0.5 min-w-0 truncate text-xs text-slate-400" title={typeLine}>{typeLine}</p>
                    </div>
                      <div className="mt-1.5 space-y-1 text-xs leading-[18px] text-slate-600">
                      <div className="flex min-w-0 items-start gap-1.5"><Clock3 className="mt-0.5 size-3.5 shrink-0 text-slate-400" /><span className="min-w-0 truncate" title={scheduleLabel}>{scheduleLabel}</span></div>
                      {shouldShowDifferentFacility(visit.facilityId, currentFacilityId) && (
                        <div className="flex min-w-0 items-start gap-1.5 text-slate-700"><MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" /><span className="min-w-0 truncate" title={visit.facilityName}><span className="font-medium">Farklı tesis:</span> {visit.facilityName}</span></div>
                      )}
                    </div>
                  </button>
                )
              })}
            </section>
          ))}
        </div>
      )}
    </section>
  )
}

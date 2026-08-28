import { Clock3, Search } from "lucide-react"
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatTr } from "@/lib/date"
import { cn } from "@/lib/utils"
import { useVisits } from "@/features/visits/visit-context"
import {
  filterSecurityVisitRows,
  getExpectedSecurityVisits,
  getInsideSecurityVisits,
  getSecurityOperationView,
  getSecurityOperationViewParams,
  getSecurityScopedVisits,
  securityOperationViews,
  type SecurityOperationView,
  type SecurityVisitRow,
} from "./security-operations"

const viewLabels: Record<SecurityOperationView, string> = {
  expected: "Beklenen",
  inside: "İçeride",
  cards: "Kart sorunları",
}

export function SecurityOperationsPage() {
  const { visits, referenceData, isLoading, error } = useVisits()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState("")
  const [now, setNow] = useState(() => new Date())
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const activeView = getSecurityOperationView(searchParams)

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(intervalId)
  }, [])

  const scope = useMemo(() => {
    if (!referenceData) return null
    const { companyId, facilityId } = referenceData.currentEmployee
    return {
      companyId,
      facilityId,
      companyName: referenceData.companies.find((company) => company.id === companyId)?.name ?? "—",
      facilityName: referenceData.facilities.find((facility) => facility.id === facilityId && facility.companyId === companyId)?.name ?? "—",
    }
  }, [referenceData])

  const scopedVisits = useMemo(() => scope ? getSecurityScopedVisits(visits, scope.companyId, scope.facilityId) : [], [scope, visits])
  const expectedRows = useMemo(() => getExpectedSecurityVisits(scopedVisits, now), [now, scopedVisits])
  const insideRows = useMemo(() => getInsideSecurityVisits(scopedVisits, now), [now, scopedVisits])
  const filteredRows = useMemo(() => {
    const activeRows = activeView === "expected" ? expectedRows : activeView === "inside" ? insideRows : []
    return filterSecurityVisitRows(activeRows, search)
  }, [activeView, expectedRows, insideRows, search])

  function selectView(view: SecurityOperationView) {
    setSearchParams(getSecurityOperationViewParams(searchParams, view))
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, view: SecurityOperationView) {
    const index = securityOperationViews.indexOf(view)
    const nextIndex = event.key === "ArrowRight" ? (index + 1) % securityOperationViews.length
      : event.key === "ArrowLeft" ? (index - 1 + securityOperationViews.length) % securityOperationViews.length
        : event.key === "Home" ? 0
          : event.key === "End" ? securityOperationViews.length - 1
            : -1
    if (nextIndex < 0) return
    event.preventDefault()
    const nextView = securityOperationViews[nextIndex]
    selectView(nextView)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <h1 className="sr-only">Güvenlik Operasyonu</h1>

      <div className="flex shrink-0 flex-col gap-2 rounded-lg border bg-white p-2.5 shadow-panel lg:flex-row lg:items-center">
        <div className="flex min-w-0 shrink-0 items-center gap-2 border-b border-slate-100 pb-2 lg:w-[260px] lg:border-b-0 lg:border-r lg:pb-0 lg:pr-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700"><Clock3 className="size-4" aria-hidden="true" /></div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-semibold text-slate-900">{scope?.companyName ?? "Çalışma bağlamı"}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{scope?.facilityName ?? "Yükleniyor…"}</p>
          </div>
        </div>

        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Aktif operasyon görünümünde ara</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ziyaretçi, firma veya ev sahibi ara"
            aria-label="Ziyaretçi, firma veya ev sahibi ara"
            className="h-9 pl-9"
          />
        </label>

        <Button type="button" className="h-9 shrink-0" disabled aria-describedby="unplanned-visit-note">+ Plansız ziyaret</Button>
        <span id="unplanned-visit-note" className="sr-only">Plansız ziyaret işlemi sonraki aşamada kullanıma açılacaktır.</span>
      </div>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-white shadow-panel" aria-label="Günlük ziyaret operasyonu">
        <div className="flex shrink-0 items-center gap-1 border-b bg-slate-50/80 px-2.5 pt-2" role="tablist" aria-label="Operasyon görünümleri">
          {securityOperationViews.map((view, index) => {
            const count = view === "expected" ? expectedRows.length : view === "inside" ? insideRows.length : 0
            const selected = activeView === view
            return (
              <button
                key={view}
                ref={(element) => { tabRefs.current[index] = element }}
                id={`security-tab-${view}`}
                type="button"
                role="tab"
                tabIndex={selected ? 0 : -1}
                aria-selected={selected}
                aria-controls={`security-panel-${view}`}
                onClick={() => selectView(view)}
                onKeyDown={(event) => handleTabKeyDown(event, view)}
                className={cn("relative flex h-9 items-center gap-1.5 rounded-t-md px-3 text-xs font-semibold transition-colors", selected ? "bg-white text-blue-700 shadow-[0_-1px_0_0_rgb(226_232_240),1px_0_0_0_rgb(226_232_240),-1px_0_0_0_rgb(226_232_240)]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")}
              >
                {viewLabels[view]}
                <span className={cn("inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", selected ? "bg-blue-50 text-blue-700" : "bg-slate-200/70 text-slate-600")}>{count}</span>
                {selected && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-blue-600" aria-hidden="true" />}
              </button>
            )
          })}
        </div>

        <div
          id={`security-panel-${activeView}`}
          role="tabpanel"
          aria-labelledby={`security-tab-${activeView}`}
          className="min-h-0 flex-1 overflow-hidden"
        >
          {isLoading ? <WorkspaceState message="Ziyaretler yükleniyor…" />
            : error ? <WorkspaceState message={error} tone="error" />
              : activeView === "cards" ? <WorkspaceState message="Kart sorunu bulunan kayıt yok." />
                : filteredRows.length === 0 ? <WorkspaceState message={search.trim() ? "Aramayla eşleşen kayıt yok." : activeView === "expected" ? "Bugün beklenen ziyaret yok." : "İçeride ziyaretçi yok."} />
                  : activeView === "expected" ? <ExpectedVisitsTable rows={filteredRows} /> : <InsideVisitsTable rows={filteredRows} />}
        </div>
      </section>
    </div>
  )
}

function ExpectedVisitsTable({ rows }: { rows: SecurityVisitRow[] }) {
  return (
    <div className="h-full min-h-0 overflow-auto scrollbar-thin">
      <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left">
        <thead className="sticky top-0 z-10 bg-white text-[10px] uppercase tracking-[0.06em] text-slate-500 shadow-[0_1px_0_0_rgb(226_232_240)]">
          <tr><TableHeading>Saat</TableHeading><TableHeading>Ziyaretçi</TableHeading><TableHeading>Firma</TableHeading><TableHeading>Ev sahibi</TableHeading><TableHeading>Ziyaret türü</TableHeading><TableHeading>Durum</TableHeading></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(({ visit, isDelayed }) => (
            <tr key={visit.id} className="h-12 text-xs text-slate-700">
              <TableCell className="w-20 font-semibold tabular-nums text-slate-900">{formatVisitTime(visit.plannedStart)}</TableCell>
              <TableCell className="font-semibold text-slate-900">{visit.visitor.firstName} {visit.visitor.lastName}</TableCell>
              <TableCell>{visit.visitor.company}</TableCell>
              <TableCell>{visit.hostEmployeeName}</TableCell>
              <TableCell>{visit.visitTypeName}</TableCell>
              <TableCell><StatusPill tone={isDelayed ? "warning" : "neutral"}>{isDelayed ? "Gecikti" : "Planlandı"}</StatusPill></TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InsideVisitsTable({ rows }: { rows: SecurityVisitRow[] }) {
  return (
    <div className="h-full min-h-0 overflow-auto scrollbar-thin">
      <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left">
        <thead className="sticky top-0 z-10 bg-white text-[10px] uppercase tracking-[0.06em] text-slate-500 shadow-[0_1px_0_0_rgb(226_232_240)]">
          <tr><TableHeading>Ziyaretçi</TableHeading><TableHeading>Firma</TableHeading><TableHeading>Ev sahibi</TableHeading><TableHeading>Giriş</TableHeading><TableHeading>Planlanan çıkış</TableHeading><TableHeading>Durum</TableHeading></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(({ visit, isDelayed, delayMinutes }) => (
            <tr key={visit.id} className="h-12 text-xs text-slate-700">
              <TableCell className="font-semibold text-slate-900">{visit.visitor.firstName} {visit.visitor.lastName}</TableCell>
              <TableCell>{visit.visitor.company}</TableCell>
              <TableCell>{visit.hostEmployeeName}</TableCell>
              <TableCell className="tabular-nums">{visit.actualCheckIn ? formatVisitTime(visit.actualCheckIn) : "—"}</TableCell>
              <TableCell className="tabular-nums">{formatVisitTime(visit.plannedEnd)}</TableCell>
              <TableCell><StatusPill tone={isDelayed ? "danger" : "success"}>{isDelayed ? `Süre aştı · ${delayMinutes} dk` : "İçeride"}</StatusPill></TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TableHeading({ children }: { children: React.ReactNode }) {
  return <th scope="col" className="h-9 whitespace-nowrap px-3 font-semibold">{children}</th>
}

function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("max-w-[240px] truncate px-3", className)}>{children}</td>
}

function StatusPill({ children, tone }: { children: React.ReactNode; tone: "neutral" | "warning" | "success" | "danger" }) {
  const tones = {
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
  }
  return <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold", tones[tone])}>{children}</span>
}

function WorkspaceState({ message, tone = "neutral" }: { message: string; tone?: "neutral" | "error" }) {
  return <div className={cn("flex h-full min-h-44 items-center justify-center px-4 text-center text-sm", tone === "error" ? "text-rose-700" : "text-slate-500")} role={tone === "error" ? "alert" : "status"}>{message}</div>
}

function formatVisitTime(value: string) {
  return formatTr(new Date(value), "HH:mm")
}

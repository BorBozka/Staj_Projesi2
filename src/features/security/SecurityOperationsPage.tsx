import { Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Visit } from "@/domain/visits"
import { SecurityCheckInDialog } from "@/features/security/SecurityCheckInDialog"
import { SecurityCheckOutDialog } from "@/features/security/SecurityCheckOutDialog"
import { SecurityPendingCardReturnsDialog } from "@/features/security/SecurityPendingCardReturnsDialog"
import { SecurityUnplannedVisitDialog } from "@/features/security/SecurityUnplannedVisitDialog"
import { formatTr } from "@/lib/date"
import { cn } from "@/lib/utils"
import { useVisits } from "@/features/visits/visit-context"
import { securityService } from "@/services"
import type { SecurityCardIssue } from "@/services/security-service"
import {
  filterSecurityVisitRows,
  getExpectedSecurityVisits,
  getInsideSecurityVisits,
  getSecurityScopedVisits,
  groupExpectedSecurityVisits,
  type SecurityVisitRow,
} from "./security-operations"

export function SecurityOperationsPage() {
  const { visits, referenceData, isLoading, error, reload } = useVisits()
  const [search, setSearch] = useState("")
  const [now, setNow] = useState(() => new Date())
  const [checkInTarget, setCheckInTarget] = useState<Visit | null>(null)
  const [checkOutTarget, setCheckOutTarget] = useState<Visit | null>(null)
  const [cardIssues, setCardIssues] = useState<SecurityCardIssue[]>([])
  const [cardReturnsOpen, setCardReturnsOpen] = useState(false)
  const [unplannedVisitOpen, setUnplannedVisitOpen] = useState(false)

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    let cancelled = false
    void securityService.getUnreturnedVisitorCardIssues().then((issues) => {
      if (!cancelled) setCardIssues(issues)
    })
    return () => { cancelled = true }
  }, [visits])

  const scope = useMemo(() => {
    if (!referenceData) return null
    const { companyId, facilityId } = referenceData.currentEmployee
    return {
      companyId,
      facilityId,
    }
  }, [referenceData])

  const scopedVisits = useMemo(() => scope ? getSecurityScopedVisits(visits, scope.companyId, scope.facilityId) : [], [scope, visits])
  const expectedRows = useMemo(() => filterSecurityVisitRows(getExpectedSecurityVisits(scopedVisits, now), search), [now, scopedVisits, search])
  const expectedGroups = useMemo(() => groupExpectedSecurityVisits(expectedRows), [expectedRows])
  const insideRows = useMemo(() => filterSecurityVisitRows(getInsideSecurityVisits(scopedVisits, now), search), [now, scopedVisits, search])
  const scopedCardIssues = useMemo(() => scope ? cardIssues.filter(({ visit }) => visit.hostCompanyId === scope.companyId && visit.facilityId === scope.facilityId) : [], [cardIssues, scope])

  useEffect(() => {
    if (scopedCardIssues.length === 0) setCardReturnsOpen(false)
  }, [scopedCardIssues.length])

  const receiveReturnedCard = async (visitId: string) => {
    await securityService.receiveReturnedVisitorCard(visitId)
    await reload()
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <h1 className="sr-only">Güvenlik Operasyonu</h1>

      <div className="flex shrink-0 items-center gap-2 py-1">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Beklenen ve içerideki ziyaretlerde ara</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ziyaretçi, firma veya ev sahibi ara"
            aria-label="Ziyaretçi, firma veya ev sahibi ara"
            className="h-9 border-slate-200/70 bg-slate-50/80 pl-9 shadow-none transition-colors placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:ring-offset-0"
          />
        </label>

        {scopedCardIssues.length > 0 && (
          <Button type="button" variant="outline" className="h-9 shrink-0" onClick={() => setCardReturnsOpen(true)}>
            İade bekleyen kartlar · {scopedCardIssues.length}
          </Button>
        )}

        <Button type="button" className="h-9 shrink-0" disabled={!scope} onClick={() => setUnplannedVisitOpen(true)}>+ Plansız ziyaret</Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden grid-rows-2 lg:grid-cols-2 lg:grid-rows-1">
        <OperationPanel title="Beklenenler" count={expectedRows.length} ariaLabel="Beklenen ziyaretler">
          {isLoading ? <PanelState message="Yükleniyor…" />
            : error ? <PanelState message={error} tone="error" />
              : expectedRows.length === 0 ? <PanelState message={search.trim() ? "Aramayla eşleşen kayıt yok." : "Bugün beklenen ziyaret yok."} />
                : <div className="py-1">
                    {expectedGroups.delayed.length > 0 && <ExpectedVisitGroup title="Gecikenler" rows={expectedGroups.delayed} onCheckIn={setCheckInTarget} />}
                    {expectedGroups.upcoming.length > 0 && <ExpectedVisitGroup title="Sıradakiler" rows={expectedGroups.upcoming} onCheckIn={setCheckInTarget} />}
                  </div>}
        </OperationPanel>

        <OperationPanel title="İçeride" count={insideRows.length} ariaLabel="İçerideki ziyaretçiler">
          {isLoading ? <PanelState message="Yükleniyor…" />
            : error ? <PanelState message={error} tone="error" />
              : insideRows.length === 0 ? <PanelState message={search.trim() ? "Aramayla eşleşen kayıt yok." : "İçeride ziyaretçi yok."} />
                : <ul className="divide-y divide-slate-100">
                    {insideRows.map((row) => <InsideRow key={row.visit.id} row={row} onCheckOut={setCheckOutTarget} />)}
                  </ul>}
        </OperationPanel>
      </div>

      <SecurityPendingCardReturnsDialog
        issues={scopedCardIssues}
        open={cardReturnsOpen}
        onOpenChange={setCardReturnsOpen}
        onReceive={receiveReturnedCard}
      />
      <SecurityCheckInDialog
        visit={checkInTarget}
        open={Boolean(checkInTarget)}
        onOpenChange={(next) => { if (!next) setCheckInTarget(null) }}
        onCheckedIn={() => { setCheckInTarget(null); void reload() }}
      />
      <SecurityCheckOutDialog
        visit={checkOutTarget}
        open={Boolean(checkOutTarget)}
        onOpenChange={(next) => { if (!next) setCheckOutTarget(null) }}
        onCheckedOut={() => { setCheckOutTarget(null); void reload() }}
      />
      {scope && referenceData && <SecurityUnplannedVisitDialog
        open={unplannedVisitOpen}
        onOpenChange={setUnplannedVisitOpen}
        onCreated={() => { void reload() }}
        scope={{ companyId: scope.companyId, facilityId: scope.facilityId, creatorEmployeeId: referenceData.currentEmployee.employeeId }}
        visitTypes={referenceData.visitTypes}
      />}
    </div>
  )
}

function OperationPanel({ title, count, ariaLabel, children }: { title: string; count: number; ariaLabel: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-white shadow-panel" aria-label={ariaLabel}>
      <header className="flex shrink-0 items-center border-b bg-slate-50/80 px-3 py-2">
        <h2 className="text-xs font-semibold text-slate-700">{title} <span className="tabular-nums text-slate-400">· {count}</span></h2>
      </header>
      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">{children}</div>
    </section>
  )
}

function ExpectedVisitGroup({ title, rows, onCheckIn }: { title: string; rows: SecurityVisitRow[]; onCheckIn(visit: Visit): void }) {
  return (
    <section className="py-1.5" aria-label={title}>
      <h3 className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <ul>
        {rows.map((row, index) => <ExpectedRow key={row.visit.id} row={row} isFirst={index === 0} isLast={index === rows.length - 1} onCheckIn={onCheckIn} />)}
      </ul>
    </section>
  )
}

function ExpectedRow({ row, isFirst, isLast, onCheckIn }: { row: SecurityVisitRow; isFirst: boolean; isLast: boolean; onCheckIn(visit: Visit): void }) {
  const { visit, isDelayed } = row
  return (
    <li className="relative border-b border-slate-100 last:border-b-0">
      <div className="grid h-14 w-full grid-cols-[3rem_1rem_minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-2 px-3 py-2">
        <span className="col-start-1 row-start-1 text-xs font-semibold tabular-nums text-slate-900">{formatVisitTime(visit.plannedStart)}</span>
        {isDelayed && <span className="col-start-1 row-start-2 text-[10px] font-semibold text-amber-700">Gecikti</span>}
        <div className="col-start-2 row-span-2 row-start-1 relative flex h-full items-center justify-center" aria-hidden="true">
          <span className={cn("absolute left-1/2 w-px -translate-x-1/2 bg-slate-200/70", isFirst ? "top-1/2" : "top-0", isLast ? "bottom-1/2" : "bottom-0")} />
          <span className="relative size-1.5 rounded-full border border-slate-300 bg-white" />
        </div>
        <div className="col-start-3 row-span-2 row-start-1 flex min-w-0 flex-col justify-center">
          <span className="min-w-0 truncate text-xs font-semibold text-slate-900">{visit.visitor.firstName} {visit.visitor.lastName}</span>
          <p className="mt-1 truncate text-[11px] text-slate-500">{visit.visitTypeName} · {visit.visitor.company} · {visit.hostEmployeeName}</p>
        </div>
        <div className="col-start-4 row-span-2 row-start-1 flex items-center justify-end">
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => onCheckIn(visit)}>Giriş yap</Button>
        </div>
      </div>
    </li>
  )
}

function InsideRow({ row, onCheckOut }: { row: SecurityVisitRow; onCheckOut(visit: Visit): void }) {
  const { visit, isDelayed, delayMinutes } = row
  const checkInLabel = visit.actualCheckIn ? formatVisitTime(visit.actualCheckIn) : "—"
  return (
    <li>
      <div className="grid h-14 w-full grid-cols-[minmax(0,1fr)_8.25rem_auto] grid-rows-[1fr_1fr] items-stretch gap-x-2 px-3 py-2">
        <div className="col-start-1 row-start-1 flex min-w-0 items-center"><span className="min-w-0 truncate text-xs font-semibold text-slate-900">{visit.visitor.firstName} {visit.visitor.lastName}</span></div>
        <p className="col-start-1 row-start-2 mt-1 min-w-0 truncate text-[11px] text-slate-500">
          <span className="min-w-0 truncate text-slate-500">{visit.visitTypeName} · {visit.visitor.company} · {visit.hostEmployeeName}</span>
        </p>
        <div className="col-start-2 row-span-2 row-start-1 flex flex-col justify-center text-[11px] leading-4 tabular-nums text-slate-400">
          <span>Giriş {checkInLabel}</span>
          <span>Beklenen {formatVisitTime(visit.plannedEnd)}{isDelayed && <> · <strong className="font-semibold text-rose-700">+{delayMinutes} dk</strong></>}</span>
        </div>
        <div className="col-start-3 row-span-2 row-start-1 flex items-center justify-end">
          <Button type="button" size="sm" className="h-7 px-2 text-[11px]" onClick={() => onCheckOut(visit)}>Çıkış yap</Button>
        </div>
      </div>
    </li>
  )
}

function PanelState({ message, tone = "neutral" }: { message: string; tone?: "neutral" | "error" }) {
  return <div className={cn("flex h-full min-h-32 items-center justify-center px-4 text-center text-sm", tone === "error" ? "text-rose-700" : "text-slate-500")} role={tone === "error" ? "alert" : "status"}>{message}</div>
}

function formatVisitTime(value: string) {
  return formatTr(new Date(value), "HH:mm")
}

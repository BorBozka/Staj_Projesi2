import { Building2, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Visit } from "@/domain/visits"
import { SecurityCheckInDialog } from "@/features/security/SecurityCheckInDialog"
import { SecurityCheckOutDialog } from "@/features/security/SecurityCheckOutDialog"
import { SecurityPendingCardReturnsDialog } from "@/features/security/SecurityPendingCardReturnsDialog"
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
      companyName: referenceData.companies.find((company) => company.id === companyId)?.name ?? "—",
      facilityName: referenceData.facilities.find((facility) => facility.id === facilityId && facility.companyId === companyId)?.name ?? "—",
    }
  }, [referenceData])

  const scopedVisits = useMemo(() => scope ? getSecurityScopedVisits(visits, scope.companyId, scope.facilityId) : [], [scope, visits])
  const expectedRows = useMemo(() => filterSecurityVisitRows(getExpectedSecurityVisits(scopedVisits, now), search), [now, scopedVisits, search])
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

      <div className="flex shrink-0 flex-col gap-2 rounded-lg border bg-white p-2.5 shadow-panel lg:flex-row lg:items-center">
        <div className="flex min-w-0 shrink-0 items-center gap-2 border-b border-slate-100 pb-2 lg:w-[260px] lg:border-b-0 lg:border-r lg:pb-0 lg:pr-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700"><Building2 className="size-4" aria-hidden="true" /></div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-semibold text-slate-900">{scope?.companyName ?? "Çalışma bağlamı"}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{scope?.facilityName ?? "Yükleniyor…"}</p>
          </div>
        </div>

        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Beklenen ve içerideki ziyaretlerde ara</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ziyaretçi, firma veya ev sahibi ara"
            aria-label="Ziyaretçi, firma veya ev sahibi ara"
            className="h-9 pl-9 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </label>

        {scopedCardIssues.length > 0 && (
          <Button type="button" variant="outline" className="h-9 shrink-0" onClick={() => setCardReturnsOpen(true)}>
            İade bekleyen kartlar · {scopedCardIssues.length}
          </Button>
        )}

        <Button type="button" className="h-9 shrink-0" disabled aria-describedby="unplanned-visit-note">+ Plansız ziyaret</Button>
        <span id="unplanned-visit-note" className="sr-only">Plansız ziyaret işlemi sonraki aşamada kullanıma açılacaktır.</span>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden grid-rows-2 lg:grid-cols-2 lg:grid-rows-1">
        <OperationPanel title="Beklenenler" count={expectedRows.length} ariaLabel="Beklenen ziyaretler">
          {isLoading ? <PanelState message="Yükleniyor…" />
            : error ? <PanelState message={error} tone="error" />
              : expectedRows.length === 0 ? <PanelState message={search.trim() ? "Aramayla eşleşen kayıt yok." : "Bugün beklenen ziyaret yok."} />
                : <ul className="divide-y divide-slate-100">
                    {expectedRows.map((row) => <ExpectedRow key={row.visit.id} row={row} onCheckIn={setCheckInTarget} />)}
                  </ul>}
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

function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex shrink-0 items-center gap-1">{children}</div>
}

function ExpectedRow({ row, onCheckIn }: { row: SecurityVisitRow; onCheckIn(visit: Visit): void }) {
  const { visit, isDelayed } = row
  return (
    <li>
      <div className="flex w-full items-center gap-3 px-3">
        <div className="h-14 min-w-0 flex-1 py-2">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-900">{formatVisitTime(visit.plannedStart)}</span>
            <span className="truncate text-xs font-semibold text-slate-900">{visit.visitor.firstName} {visit.visitor.lastName}</span>
            <span className="shrink-0 text-[10px] text-slate-500">{visit.visitTypeName}</span>
            {isDelayed && <StatusPill tone="warning">Gecikti</StatusPill>}
          </div>
          <p className="mt-1 truncate text-[11px] text-slate-500">{visit.visitor.company} · {visit.hostEmployeeName}</p>
        </div>
        <RowActions>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => onCheckIn(visit)}>Giriş yap</Button>
        </RowActions>
      </div>
    </li>
  )
}

function InsideRow({ row, onCheckOut }: { row: SecurityVisitRow; onCheckOut(visit: Visit): void }) {
  const { visit, isDelayed, delayMinutes } = row
  const checkInLabel = visit.actualCheckIn ? formatVisitTime(visit.actualCheckIn) : "—"
  return (
    <li>
      <div className="flex w-full items-center gap-3 px-3">
        <div className="h-14 min-w-0 flex-1 py-2">
          <div className="flex items-center gap-2">
            <span className="truncate text-xs font-semibold text-slate-900">{visit.visitor.firstName} {visit.visitor.lastName}</span>
            <span className="shrink-0 text-[10px] text-slate-500">{visit.visitTypeName}</span>
            {isDelayed && <StatusPill tone="danger">Süre aştı · {delayMinutes} dk</StatusPill>}
          </div>
          <p className="mt-1 flex items-center justify-between gap-2 text-[11px]">
            <span className="min-w-0 flex-1 truncate text-slate-500">{visit.visitor.company} · {visit.hostEmployeeName}</span>
            <span className="shrink-0 text-slate-400">Giriş {checkInLabel} · Beklenen çıkış {formatVisitTime(visit.plannedEnd)}</span>
          </p>
        </div>
        <RowActions>
          <Button type="button" size="sm" className="h-7 px-2 text-[11px]" onClick={() => onCheckOut(visit)}>Çıkış yap</Button>
        </RowActions>
      </div>
    </li>
  )
}

function StatusPill({ children, tone }: { children: React.ReactNode; tone: "warning" | "danger" }) {
  const tones = {
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
  }
  return <span className={cn("inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold", tones[tone])}>{children}</span>
}

function PanelState({ message, tone = "neutral" }: { message: string; tone?: "neutral" | "error" }) {
  return <div className={cn("flex h-full min-h-32 items-center justify-center px-4 text-center text-sm", tone === "error" ? "text-rose-700" : "text-slate-500")} role={tone === "error" ? "alert" : "status"}>{message}</div>
}

function formatVisitTime(value: string) {
  return formatTr(new Date(value), "HH:mm")
}

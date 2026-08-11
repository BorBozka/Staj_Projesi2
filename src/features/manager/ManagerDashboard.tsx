import { format } from "date-fns"
import { CircleAlert, PackageCheck, RefreshCw, UserRound } from "lucide-react"
import { useEffect, useMemo, useState, type ReactElement } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { ExpectedAfterHoursDelivery } from "@/domain/manager-dashboard"
import type { Visit } from "@/domain/visits"
import { getOperationNowIndicator } from "@/features/manager/manager-clock"
import { ManagerDashboardFilters } from "@/features/manager/ManagerDashboardFilters"
import { useManagerRefresh } from "@/features/manager/manager-refresh-context"
import { VisitDetailsDialog } from "@/features/visits/VisitDetailsDialog"
import { VisitStatusBadge } from "@/features/visits/VisitStatusBadge"
import { useVisits } from "@/features/visits/visit-context"
import { formatTr } from "@/lib/date"
import { cn } from "@/lib/utils"
import { managerDashboardService } from "@/services"
import {
  getDashboardVisitStatus,
  getDelayMinutes,
  getNextPlannedVisits,
  getOperationBins,
  getScopedVisits,
  getStatusCounts,
  getTodayVisits,
  type DashboardVisitStatus,
} from "./manager-dashboard-utils"

type SelectionDescriptor =
  | { anchorKey: string; key: string; kind: "hour"; hour: number }
  | { anchorKey: string; key: string; kind: "delivery"; hour: number }
  | { anchorKey: string; key: string; kind: "status"; status: DashboardVisitStatus }

type SelectionData = {
  title: string
  visits: Visit[]
  deliveries: ExpectedAfterHoursDelivery[]
}

const statusMeta: { status: DashboardVisitStatus; label: string; color: string }[] = [
  { status: "PLANNED", label: "Beklenen", color: "#1463eb" },
  { status: "LATE", label: "Gecikti", color: "#f59e0b" },
  { status: "CHECKED_IN", label: "İçeride", color: "#4caf62" },
  { status: "OVERDUE", label: "Süre Aşımı", color: "#e11d48" },
  { status: "CHECKED_OUT", label: "Tamamlandı", color: "#8bb8ff" },
  { status: "CANCELLED", label: "İptal", color: "#aeb6c2" },
]

export function ManagerDashboard() {
  const { visits, referenceData, isLoading } = useVisits()
  const { companyId, currentTime, facilityId, isRefreshing, refresh, refreshVersion, lastUpdated } = useManagerRefresh()
  const [deliveries, setDeliveries] = useState<ExpectedAfterHoursDelivery[]>([])
  const [selection, setSelection] = useState<SelectionDescriptor | null>(null)
  const [viewingVisit, setViewingVisit] = useState<Visit | null>(null)
  const now = lastUpdated

  useEffect(() => {
    void managerDashboardService.listExpectedAfterHoursDeliveries().then(setDeliveries)
  }, [refreshVersion])

  const scopedVisits = useMemo(() => getScopedVisits(visits, { companyId, facilityId }), [companyId, facilityId, visits])
  const todayVisits = getTodayVisits(scopedVisits, now)
  const insideVisits = scopedVisits
    .filter((visit) => visit.status === "CHECKED_IN")
    .sort((left, right) => getDelayMinutes(right, now) - getDelayMinutes(left, now))
  const scopedDeliveries = deliveries.filter((delivery) =>
    (companyId === "all" || delivery.companyId === companyId) &&
    (facilityId === "all" || delivery.facilityId === facilityId),
  )
  const counts = getStatusCounts(todayVisits, currentTime)
  const futureVisits = getNextPlannedVisits(todayVisits, now, todayVisits.length)
  const nextVisits = futureVisits.slice(0, 5)
  const selectionData = selection ? resolveSelection(selection, todayVisits, scopedDeliveries, currentTime) : null

  useEffect(() => {
    if (!selection) return
    const statusIsGone = selection.kind === "status" && !counts.some((count) => count.status === selection.status)
    const deliveryIsGone = selection.kind === "delivery" && !scopedDeliveries.some((delivery) => new Date(delivery.expectedAt).getHours() === selection.hour)
    if (statusIsGone || deliveryIsGone) setSelection(null)
  }, [counts, scopedDeliveries, selection])

  if (isLoading || !referenceData) return <DashboardSkeleton />

  return (
    <div className="grid min-w-0 gap-4">
      <section className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]">
        <InsideVisits
          visits={insideVisits}
          now={now}
          controls={(
            <div className="flex min-w-0 max-w-full items-center gap-1.5">
              <ManagerDashboardFilters />
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1.5 px-2 text-slate-600"
                onClick={() => void refresh()}
                disabled={isRefreshing}
                aria-label={`Dashboard verilerini yenile. Son güncelleme: Bugün ${formatTr(lastUpdated, "HH:mm")}`}
                title={`Son güncelleme: Bugün ${formatTr(lastUpdated, "HH:mm")}`}
              >
                <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
                <span className="tabular-nums">{formatTr(lastUpdated, "HH:mm")}</span>
              </Button>
            </div>
          )}
        />
        <Distribution
          counts={counts}
          selection={selection}
          selectionData={selectionData}
          onSelectionChange={setSelection}
          onVisitOpen={setViewingVisit}
        />
      </section>

      <Operations
        visits={todayVisits}
        deliveries={scopedDeliveries}
        now={currentTime}
        selection={selection}
        selectionData={selectionData}
        onSelectionChange={setSelection}
        onVisitOpen={setViewingVisit}
      />

      <NextVisits visits={nextVisits} total={futureVisits.length} now={now} />

      <VisitDetailsDialog
        visit={viewingVisit}
        open={Boolean(viewingVisit)}
        onOpenChange={(open) => !open && setViewingVisit(null)}
        onEdit={noopVisitAction}
        onReschedule={noopVisitAction}
        onCancel={noopVisitAction}
        readOnly
      />
    </div>
  )
}

function InsideVisits({ visits, now, controls }: { visits: Visit[]; now: Date; controls: ReactElement }) {
  return (
    <section className="flex h-[340px] flex-col overflow-hidden rounded-lg border border-emerald-200 bg-card shadow-panel">
      <div className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-l-[3px] border-emerald-500 bg-emerald-50/35 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-3 shrink-0 rounded-full bg-emerald-500" />
          <h2 className="truncate text-lg font-semibold">Şu Anda İçeride</h2>
        </div>
        {controls}
      </div>
      {visits.length === 0 ? (
        <p className="px-4 py-7 text-center text-sm text-slate-600">Seçili bağlamda içeride ziyaretçi bulunmuyor.</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[760px] table-fixed text-left text-[13px]">
            <thead className="sticky top-0 z-[1] border-y border-emerald-100 bg-white text-xs font-semibold text-slate-600">
              <tr>
                <th className="w-[22%] px-3 py-2">Ziyaretçi / şirket</th>
                <th className="w-[14%] px-2 py-2">Ev sahibi</th>
                <th className="w-[14%] px-2 py-2">Ziyaret türü</th>
                <th className="w-[15%] px-2 py-2">Tesis</th>
                <th className="w-[8%] px-2 py-2">Giriş</th>
                <th className="w-[12%] px-2 py-2">Planlanan çıkış</th>
                <th className="w-[15%] px-2 py-2">Uyarı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visits.map((visit) => {
                const delay = getDelayMinutes(visit, now)
                return (
                  <tr key={visit.id}>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <UserRound className="size-4 shrink-0 text-emerald-700" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{visit.visitor.firstName} {visit.visitor.lastName}</p>
                          <p className="truncate text-xs text-slate-600">{visit.hostCompanyName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="truncate px-2 py-1.5">{visit.hostEmployeeName}</td>
                    <td className="truncate px-2 py-1.5">{visit.visitTypeName}</td>
                    <td className="truncate px-2 py-1.5">{visit.facilityName}</td>
                    <td className="px-2 py-1.5 tabular-nums">{visit.actualCheckIn ? formatTr(new Date(visit.actualCheckIn), "HH:mm") : "—"}</td>
                    <td className="px-2 py-1.5 tabular-nums">{formatTr(new Date(visit.plannedEnd), "HH:mm")}</td>
                    <td className="px-2 py-1.5">
                      {delay > 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-600"><CircleAlert className="size-3.5" />{delay} dk aştı</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

type InteractiveChartProps = {
  selection: SelectionDescriptor | null
  selectionData: SelectionData | null
  onSelectionChange: React.Dispatch<React.SetStateAction<SelectionDescriptor | null>>
  onVisitOpen(visit: Visit): void
}

function Operations({ visits, deliveries, now, ...interactiveProps }: { visits: Visit[]; deliveries: ExpectedAfterHoursDelivery[]; now: Date } & InteractiveChartProps) {
  const bins = getOperationBins(visits, deliveries, 8, 23)
  const max = Math.max(1, ...bins.flatMap((bin) => [bin.planned, bin.actual, bin.deliveries.length]))
  const nowIndicator = getOperationNowIndicator(now, 8, 23)

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border bg-card p-4 shadow-panel sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Bugünün Operasyonu</h2>
          <p className="mt-1 text-xs text-slate-600">Kayıt sayısı</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-700">
          <Legend color="bg-blue-600" label="Planlanan" />
          <Legend color="bg-blue-300" label="Gerçekleşen giriş" />
          <Legend color="bg-violet-600" label="Teslimatlar" />
        </div>
      </div>

      <div className="mt-3 overflow-x-auto pb-1">
        <div className="grid min-w-[760px] grid-cols-[30px_minmax(0,1fr)]">
          <div className="flex h-64 flex-col justify-between pb-7 text-right text-xs tabular-nums text-slate-600">
            <span>{max}</span><span>{Math.ceil(max / 2)}</span><span>0</span>
          </div>
          <div
            className="relative grid h-64 min-w-0 border-b border-l bg-[linear-gradient(to_bottom,transparent_33%,hsl(var(--border))_33%,transparent_34%,transparent_66%,hsl(var(--border))_66%,transparent_67%)]"
            style={{ gridTemplateColumns: "repeat(16,minmax(0,1fr))" }}
          >
            <div className="pointer-events-none absolute inset-y-0 left-[66.666%] w-[33.334%] bg-violet-50/80" />
            <span className="pointer-events-none absolute right-2 top-2 z-20 text-[11px] font-semibold text-violet-800">Mesai dışı</span>
            {nowIndicator && (
              <div
                className="pointer-events-none absolute inset-y-0 z-20 border-l border-rose-500"
                style={{ left: `${nowIndicator.leftPercent}%` }}
                role="img"
                aria-label={nowIndicator.label}
              >
                <span className={cn("absolute left-0 top-1 whitespace-nowrap rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm", nowIndicator.labelAlignment)}>
                  {nowIndicator.label}
                </span>
              </div>
            )}
            {bins.map((bin) => <OperationHour key={bin.hour} bin={bin} max={max} visits={visits} {...interactiveProps} />)}
          </div>
        </div>
      </div>
      <p className="ml-8 mt-1 text-center text-xs text-slate-600">Saat</p>
    </section>
  )
}

function OperationHour({ bin, max, visits, ...interactiveProps }: { bin: ReturnType<typeof getOperationBins>[number]; max: number; visits: Visit[] } & InteractiveChartProps) {
  const hourLabel = String(bin.hour).padStart(2, "0")
  const hourSelection: SelectionDescriptor = { anchorKey: `hour-trigger-${bin.hour}`, key: `hour-${bin.hour}`, kind: "hour", hour: bin.hour }
  const deliverySelection: SelectionDescriptor = { anchorKey: `delivery-trigger-${bin.hour}`, key: `delivery-${bin.hour}`, kind: "delivery", hour: bin.hour }
  const hourSelected = interactiveProps.selection?.key === hourSelection.key
  const deliverySelected = interactiveProps.selection?.key === deliverySelection.key
  const records = visits.filter((visit) => visitMatchesHour(visit, bin.hour))

  return (
    <div className={cn("relative z-[1] min-w-0 border-r border-slate-100", hourSelected && "bg-blue-100 ring-1 ring-inset ring-blue-500")}>
      <SelectionMenu descriptor={hourSelection} {...interactiveProps}>
        <button
          type="button"
          aria-label={`${hourLabel}.00 saatindeki ${records.length + bin.deliveries.length} kaydı göster`}
          className="flex size-full min-w-0 flex-col justify-end px-1 text-left hover:bg-blue-50/70 focus-visible:outline-none focus-visible:ring-0"
        >
          <span className="flex h-48 items-end justify-center gap-1">
            <Bar value={bin.planned} max={max} color="bg-blue-600" />
            <Bar value={bin.actual} max={max} color="bg-blue-300" />
          </span>
          <span className="pt-2 text-center text-xs tabular-nums text-slate-600">{hourLabel}:00</span>
        </button>
      </SelectionMenu>

      {bin.deliveries.length > 0 && (
        <SelectionMenu descriptor={deliverySelection} {...interactiveProps}>
          <button
            type="button"
            aria-label={`${hourLabel}.00 saatindeki ${bin.deliveries.length} teslimatı göster`}
            className={cn(
              "absolute bottom-7 left-1/2 z-30 flex min-h-6 min-w-6 -translate-x-1/2 items-center justify-center gap-0.5 rounded border border-violet-300 bg-violet-100 px-1 text-[11px] font-semibold text-violet-900 shadow-sm hover:bg-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600",
              deliverySelected && "bg-violet-200 ring-2 ring-violet-600",
            )}
          >
            <PackageCheck className="size-3.5" />
            {bin.deliveries.length > 1 && bin.deliveries.length}
          </button>
        </SelectionMenu>
      )}
    </div>
  )
}

function Distribution({ counts, ...interactiveProps }: { counts: { status: DashboardVisitStatus; value: number }[] } & InteractiveChartProps) {
  const segments = counts.map((count) => ({ ...statusMeta.find((item) => item.status === count.status)!, value: count.value }))
  const total = segments.reduce((sum, item) => sum + item.value, 0)
  const circumference = 2 * Math.PI * 42
  let offset = 0

  return (
    <section className="distribution-card flex min-h-[340px] flex-col overflow-hidden rounded-lg border bg-card p-4 shadow-panel xl:h-[340px]">
      <h2 className="text-lg font-semibold">Durum Dağılımı</h2>
      <div className="distribution-layout mt-1 flex flex-1 flex-row items-center justify-center gap-4">
        <svg viewBox="0 0 100 100" className="distribution-donut size-52 shrink-0" role="img" aria-label={`Toplam ${total} ziyaret durum dağılımı`}>
          <circle cx="50" cy="50" r="42" fill="none" stroke="#e8edf5" strokeWidth="14" />
          {segments.map((segment) => {
            const length = total ? (segment.value / total) * circumference : 0
            const currentOffset = offset
            const descriptor: SelectionDescriptor = {
              anchorKey: `status-slice-${segment.status}`,
              key: `status-${segment.status}`,
              kind: "status",
              status: segment.status,
            }
            const selected = interactiveProps.selection?.key === descriptor.key
            offset += length
            return (
              <SelectionMenu key={segment.status} descriptor={descriptor} {...interactiveProps}>
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={selected ? 17 : 14}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-currentOffset}
                  transform="rotate(-90 50 50)"
                  className="cursor-pointer outline-none hover:opacity-80 focus-visible:opacity-80 focus-visible:[filter:drop-shadow(0_0_2px_#2563eb)]"
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  aria-label={`${segment.label}: ${segment.value} kaydı göster`}
                  onClick={() => interactiveProps.onSelectionChange(descriptor)}
                />
              </SelectionMenu>
            )
          })}
          <text x="50" y="47" textAnchor="middle" className="pointer-events-none fill-slate-900 text-[20px] font-semibold">{total}</text>
          <text x="50" y="61" textAnchor="middle" className="pointer-events-none fill-slate-600 text-[8px]">Toplam</text>
        </svg>

        <div className="distribution-legend grid gap-2">
          {segments.map((segment) => {
            const descriptor: SelectionDescriptor = {
              anchorKey: `status-legend-${segment.status}`,
              key: `status-${segment.status}`,
              kind: "status",
              status: segment.status,
            }
            const selected = interactiveProps.selection?.key === descriptor.key
            return (
              <SelectionMenu key={segment.status} descriptor={descriptor} {...interactiveProps}>
                <button
                  type="button"
                  aria-pressed={selected}
                  className={cn(
                    "distribution-legend-item flex w-full items-center justify-between gap-4 rounded px-1.5 py-1.5 text-base text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                    selected && "bg-blue-50 text-blue-900 ring-1 ring-blue-200",
                  )}
                >
                  <span className="flex items-center gap-2"><span className="size-3.5 rounded-sm" style={{ backgroundColor: segment.color }} />{segment.label}</span>
                  <span className="font-semibold tabular-nums text-slate-900">{segment.value}</span>
                </button>
              </SelectionMenu>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function SelectionMenu({ descriptor, selection, selectionData, onSelectionChange, onVisitOpen, children }: { descriptor: SelectionDescriptor; children: ReactElement } & InteractiveChartProps) {
  const open = selection?.anchorKey === descriptor.anchorKey
  return (
    <DropdownMenu
      modal={false}
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) onSelectionChange(descriptor)
        else if (open) onSelectionChange((current) => current?.key === descriptor.key ? null : current)
      }}
    >
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      {open && selectionData && (
        <SelectionPopoverContent selection={selectionData} side={descriptor.kind === "status" ? "bottom" : "right"} onVisitOpen={onVisitOpen} />
      )}
    </DropdownMenu>
  )
}

function SelectionPopoverContent({ selection, side, onVisitOpen }: { selection: SelectionData; side: "bottom" | "right"; onVisitOpen(visit: Visit): void }) {
  const resolvedSide = side === "right" && typeof window !== "undefined" && window.innerWidth <= 480 ? "bottom" : side
  const rows = [
    ...selection.visits.map((visit) => ({ kind: "visit" as const, id: visit.id, date: new Date(visit.plannedStart), visit })),
    ...selection.deliveries.map((delivery) => ({ kind: "delivery" as const, id: delivery.id, date: new Date(delivery.expectedAt), delivery })),
  ].sort((left, right) => left.date.getTime() - right.date.getTime())

  return (
    <DropdownMenuContent
      align="center"
      side={resolvedSide}
      sideOffset={8}
      collisionPadding={12}
      sticky="always"
      className="w-[min(360px,calc(100vw-24px))] overflow-hidden p-0"
      aria-label={selection.title}
      onFocusOutside={(event) => event.preventDefault()}
    >
      <div className="border-b bg-slate-50/80 px-3 py-2.5">
        <p className="text-sm font-semibold text-slate-900" aria-live="polite">{selection.title}</p>
      </div>
      <div
        className="overflow-y-auto overflow-x-hidden p-1.5 scrollbar-thin"
        style={{ maxHeight: "min(264px, calc(var(--radix-dropdown-menu-content-available-height) - 43px))" }}
      >
        {rows.map((row) => row.kind === "visit" ? (
          <DropdownMenuItem
            key={row.id}
            className="group grid min-h-11 cursor-pointer grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-1.5 text-xs transition-colors hover:bg-blue-50 focus:bg-blue-50 focus-visible:outline-none"
            onSelect={(event) => {
              event.preventDefault()
              onVisitOpen(row.visit)
            }}
          >
            <span className="tabular-nums text-slate-600">{formatTr(row.date, "HH:mm")}</span>
            <span className="min-w-0">
              <span className="block truncate font-semibold text-slate-900 transition-colors group-hover:text-blue-700 group-focus:text-blue-700">{row.visit.visitor.firstName} {row.visit.visitor.lastName}</span>
              <span className="block truncate text-[11px] text-slate-600">{row.visit.visitTypeName}</span>
            </span>
            <VisitStatusBadge status={row.visit.status} compact />
          </DropdownMenuItem>
        ) : (
          <div key={row.id} className="grid min-h-11 grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2 rounded-sm px-2 py-1.5 text-xs">
            <span className="tabular-nums text-slate-600">{formatTr(row.date, "HH:mm")}</span>
            <span className="truncate font-semibold text-slate-900">{row.delivery.supplierName}</span>
            <span className="inline-flex items-center gap-1 rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800"><PackageCheck className="size-3" />Teslimat</span>
          </div>
        ))}
        {rows.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate-600">Bu seçim için kayıt bulunmuyor.</p>}
      </div>
    </DropdownMenuContent>
  )
}

function NextVisits({ visits, total, now }: { visits: Visit[]; total: number; now: Date }) {
  const link = `/manager/all-visits?date=${format(now, "yyyy-MM-dd")}&status=PLANNED`
  return (
    <section className="overflow-hidden rounded-lg border bg-card shadow-panel">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">Sıradaki Ziyaretler</h2>
          <p className="text-[13px] text-slate-600">Bugün yaklaşan {total}</p>
        </div>
        <Link to={link} className="text-sm font-semibold text-blue-600 hover:text-blue-700">Tümünü gör</Link>
      </div>
      {visits.length === 0 ? (
        <p className="px-4 py-7 text-sm text-slate-600">Bugün için yaklaşan ziyaret bulunmuyor.</p>
      ) : (
        <div className="divide-y">
          {visits.map((visit) => (
            <div key={visit.id} className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 px-4 py-2.5 md:grid-cols-[72px_minmax(150px,1.3fr)_minmax(115px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)]">
              <p className="font-semibold tabular-nums">{formatTr(new Date(visit.plannedStart), "HH:mm")}</p>
              <div className="min-w-0">
                <p className="truncate font-semibold">{visit.visitor.firstName} {visit.visitor.lastName}</p>
                <p className="truncate text-[13px] text-slate-600">{visit.hostCompanyName}<span className="md:hidden"> · {visit.visitTypeName}</span></p>
              </div>
              <p className="hidden truncate text-sm text-slate-700 md:block">{visit.visitTypeName}</p>
              <p className="hidden truncate text-sm text-slate-700 md:block">{visit.hostEmployeeName}</p>
              <p className="hidden truncate text-sm text-slate-700 md:block">{visit.facilityName}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function resolveSelection(selection: SelectionDescriptor, visits: Visit[], deliveries: ExpectedAfterHoursDelivery[], now: Date): SelectionData {
  if (selection.kind === "status") {
    const selectedVisits = visits.filter((visit) => getDashboardVisitStatus(visit, now) === selection.status)
    const label = statusMeta.find((item) => item.status === selection.status)?.label ?? selection.status
    return { title: `${label} · ${selectedVisits.length}`, visits: selectedVisits, deliveries: [] }
  }

  const hourLabel = String(selection.hour).padStart(2, "0")
  const selectedDeliveries = deliveries.filter((delivery) => new Date(delivery.expectedAt).getHours() === selection.hour)
  if (selection.kind === "delivery") {
    return { title: `${hourLabel}.00 · ${selectedDeliveries.length} kayıt`, visits: [], deliveries: selectedDeliveries }
  }

  const selectedVisits = visits.filter((visit) => visitMatchesHour(visit, selection.hour))
  return {
    title: `${hourLabel}.00 · ${selectedVisits.length + selectedDeliveries.length} kayıt`,
    visits: selectedVisits,
    deliveries: selectedDeliveries,
  }
}

function visitMatchesHour(visit: Visit, hour: number) {
  return new Date(visit.plannedStart).getHours() === hour || Boolean(visit.actualCheckIn && new Date(visit.actualCheckIn).getHours() === hour)
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <span className="flex h-full w-[38%] flex-col justify-end">
      <span className="mb-1 text-center text-xs font-semibold tabular-nums text-slate-800">{value || ""}</span>
      <span className={cn("min-h-px rounded-t-sm", color)} style={{ height: `${(value / max) * 100}%` }} />
    </span>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={cn("size-2.5 rounded-sm", color)} />{label}</span>
}

function DashboardSkeleton() {
  return <div className="space-y-4"><div className="h-12 animate-pulse rounded-lg border bg-slate-100" />{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-48 animate-pulse rounded-lg border bg-slate-100" />)}</div>
}

function noopVisitAction() {}

import { ArrowDown, ArrowUp, Search } from "lucide-react"
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { getGoodsDirectionLabel, getGoodsMovementDisplayStatus, type GoodsMovement } from "@/domain/goods-movements"
import { GoodsMovementDetailDialog } from "@/features/reports/GoodsMovementDetailDialog"
import { GoodsMovementTrendChart, GoodsMovementTrendLegend } from "@/features/reports/GoodsMovementTrendChart"
import {
  buildGoodsInsight,
  buildGoodsMetadata,
  calculateGoodsMovementTrend,
  calculateGoodsReportKpis,
  calculateSharedGoodsTrendYAxis,
  filterGoodsMovementsForReport,
  getGoodsReportPageCount,
  getVisibleGoodsReportPageNumbers,
  GOODS_REPORT_PAGE_SIZE,
  GOODS_REPORT_STATUS_LABELS,
  isGoodsRecordActivationKey,
  paginateGoodsReport,
  parseGoodsReportWorkspace,
  setGoodsReportPage,
  setGoodsReportWorkspace,
  searchGoodsReportRecords,
  sortGoodsReportRecords,
  type GoodsReportSortField,
  type GoodsReportGranularity,
} from "@/features/reports/goods-report-utils"
import { ReportPagination } from "@/features/reports/ReportPagination"
import {
  buildGoodsReportRows,
  downloadReportCsv,
  downloadReportExcel,
  downloadReportPdf,
  downloadElementAsPng,
  GOODS_REPORT_COLUMNS,
  type ReportExportHandle,
} from "@/features/reports/report-export"
import type { ReportsScopeFilters } from "@/features/reports/reports-filters"
import { formatTr } from "@/lib/date"
import { toggleSingleSort } from "@/lib/sort"
import { reportsService } from "@/services"

const statusBadgeClass: Record<ReturnType<typeof getGoodsMovementDisplayStatus>, string> = {
  PLANNED: "border-blue-200 bg-blue-50 text-blue-700", COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700", CANCELLED: "border-slate-200 bg-slate-100 text-slate-600", LATE: "border-amber-200 bg-amber-50 text-amber-700",
}

interface GoodsReportTabProps {
  filters: ReportsScopeFilters
  dateRangeInvalid: boolean
  selectedGranularity: GoodsReportGranularity
  comparisonFilters?: ReportsScopeFilters | null
  comparisonLabel?: string
  onExportAvailabilityChange?(canExport: boolean): void
}

export const GoodsReportTab = forwardRef<ReportExportHandle, GoodsReportTabProps>(function GoodsReportTab({ filters, dateRangeInvalid, selectedGranularity, comparisonFilters = null, comparisonLabel = "Önceki dönem", onExportAvailabilityChange }, ref) {
  const [movements, setMovements] = useState<GoodsMovement[]>([])
  const [movementsLoaded, setMovementsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [selectedMovement, setSelectedMovement] = useState<GoodsMovement | null>(null)
  const detailTriggerRef = useRef<HTMLTableRowElement | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const workspace = useMemo(() => parseGoodsReportWorkspace(searchParams), [searchParams])

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    void reportsService.getGoodsDataset({})
      .then((next) => { if (!cancelled) { setMovements(next); setMovementsLoaded(true) } })
      .catch((cause: unknown) => { if (!cancelled) setLoadError(cause instanceof Error ? cause.message : "Mal hareketi raporu alınamadı.") })
    return () => { cancelled = true }
  }, [reloadNonce])

  const reportMovements = useMemo(() => filterGoodsMovementsForReport(movements, filters), [movements, filters])
  const recordMovements = useMemo(() => sortGoodsReportRecords(searchGoodsReportRecords(reportMovements, workspace.search), workspace.sort), [reportMovements, workspace.search, workspace.sort])
  const isSingleDay = filters.startDate !== "" && filters.startDate === filters.endDate
  const trendGranularity = isSingleDay ? "hourly" : selectedGranularity
  const kpis = useMemo(() => calculateGoodsReportKpis(reportMovements), [reportMovements])
  const trend = useMemo(() => calculateGoodsMovementTrend(reportMovements, filters, trendGranularity), [filters, reportMovements, trendGranularity])
  const previousMovements = useMemo(() => comparisonFilters ? filterGoodsMovementsForReport(movements, comparisonFilters) : null, [comparisonFilters, movements])
  const hasComparisonData = previousMovements !== null && previousMovements.length > 0
  const previousKpis = useMemo(() => previousMovements ? calculateGoodsReportKpis(previousMovements) : null, [previousMovements])
  const previousTrend = useMemo(() => previousMovements && comparisonFilters ? calculateGoodsMovementTrend(previousMovements, comparisonFilters, trendGranularity) : null, [comparisonFilters, previousMovements, trendGranularity])
  const sharedAxis = useMemo(() => hasComparisonData && previousTrend ? calculateSharedGoodsTrendYAxis(trend, previousTrend) : undefined, [hasComparisonData, previousTrend, trend])
  const metadata = useMemo(() => buildGoodsMetadata(kpis, hasComparisonData ? previousKpis : null), [hasComparisonData, kpis, previousKpis])
  const insight = useMemo(() => {
    const base = buildGoodsInsight({ kpis, trend }, hasComparisonData ? previousKpis : null)
    return comparisonFilters && !hasComparisonData ? `${base} Karşılaştırma döneminde mal hareketi kaydı yok.` : base
  }, [comparisonFilters, hasComparisonData, kpis, previousKpis, trend])
  const pageCount = getGoodsReportPageCount(recordMovements.length)
  const page = Math.min(workspace.page, pageCount)
  const paginatedMovements = useMemo(() => paginateGoodsReport(recordMovements, page), [page, recordMovements])
  const visibleStart = recordMovements.length === 0 ? 0 : (page - 1) * GOODS_REPORT_PAGE_SIZE + 1
  const visibleEnd = Math.min(page * GOODS_REPORT_PAGE_SIZE, recordMovements.length)
  const headers = useMemo(() => GOODS_REPORT_COLUMNS.map((column) => column.header), [])
  const exportFilenameBase = `mal-hareketi-raporu_${filters.startDate || "tumu"}_${filters.endDate || "tumu"}`

  useEffect(() => {
    if (workspace.view !== "records" || !movementsLoaded) return
    const rawPage = searchParams.get("goodsPage")
    if (page !== workspace.page || (rawPage !== null && rawPage !== String(workspace.page))) setSearchParams(setGoodsReportPage(searchParams, page), { replace: true })
  }, [movementsLoaded, page, searchParams, setSearchParams, workspace.page, workspace.view])
  useEffect(() => { onExportAvailabilityChange?.(!dateRangeInvalid && movementsLoaded && (workspace.view === "records" ? recordMovements.length > 0 : reportMovements.length > 0)) }, [dateRangeInvalid, movementsLoaded, onExportAvailabilityChange, recordMovements.length, reportMovements.length, workspace.view])

  const exportRows = () => buildGoodsReportRows(workspace.view === "records" ? recordMovements : reportMovements)
  useImperativeHandle(ref, () => ({
    exportCsv: () => downloadReportCsv(headers, exportRows(), `${exportFilenameBase}.csv`),
    exportExcel: () => { void downloadReportExcel("Mal Hareketi", headers, exportRows(), `${exportFilenameBase}.xlsx`) },
    exportPdf: () => { void downloadReportPdf("Mal Hareketi Raporu", headers, exportRows(), `${exportFilenameBase}.pdf`) },
    exportChartPng: () => { const card = document.getElementById("goods-analysis-card"); if (card) void downloadElementAsPng(card, `mal-hareketi-analizi_${filters.startDate || "tumu"}_${filters.endDate || "tumu"}.png`) },
  }))

  if (loadError) return (
    <section className="flex h-full min-h-0 flex-col items-center justify-center rounded-lg border border-red-200 bg-card p-6 text-center shadow-panel" role="alert">
      <p className="text-sm font-semibold text-slate-900">Mal hareketi raporu yüklenemedi</p>
      <p className="mt-1 text-xs text-slate-600">{loadError}</p>
      <button type="button" className="mt-4 inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-xs font-medium text-white hover:bg-slate-700" onClick={() => setReloadNonce((value) => value + 1)}>Tekrar dene</button>
    </section>
  )
  if (!movementsLoaded) return <section className="h-full animate-pulse rounded-lg border bg-slate-100" aria-label="Rapor yükleniyor" role="status" />

  if (workspace.view === "records") return <><section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-card shadow-panel" aria-label="Mal hareketi kayıtları">{dateRangeInvalid ? <EmptyState title="Geçersiz tarih aralığı" description="Başlangıç tarihi bitiş tarihinden sonra olamaz." /> : recordMovements.length === 0 ? <EmptyState title={workspace.search ? "Eşleşen kayıt bulunamadı" : "Eşleşen mal hareketi bulunamadı"} description={workspace.search ? "Arama ifadesini değiştirerek yeniden deneyin." : "Filtre ölçütlerini değiştirerek yeniden deneyin."} showSearch /> : <><div className="min-h-0 flex-1 overflow-hidden"><div className="h-full overflow-x-auto overflow-y-hidden scrollbar-thin"><table className="h-full w-full min-w-[1100px] table-fixed text-left text-xs"><thead className="border-b bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><tr><SortableHeader className="w-[9%]" label="Yön" field="direction" sort={workspace.sort} onChange={(sort) => setSearchParams(setGoodsReportWorkspace(searchParams, { sort }))} /><SortableHeader className="w-[16%]" label="Şirket / Tesis" field="scope" sort={workspace.sort} onChange={(sort) => setSearchParams(setGoodsReportWorkspace(searchParams, { sort }))} /><SortableHeader className="w-[15%]" label="Karşı Taraf" field="counterparty" sort={workspace.sort} onChange={(sort) => setSearchParams(setGoodsReportWorkspace(searchParams, { sort }))} /><SortableHeader className="w-[14%]" label="Planlanan Tarih / Saat" field="planned" sort={workspace.sort} onChange={(sort) => setSearchParams(setGoodsReportWorkspace(searchParams, { sort }))} /><SortableHeader className="w-[14%]" label="Gerçek Zaman" field="actual" sort={workspace.sort} onChange={(sort) => setSearchParams(setGoodsReportWorkspace(searchParams, { sort }))} /><SortableHeader className="w-[10%]" label="Durum" field="status" sort={workspace.sort} onChange={(sort) => setSearchParams(setGoodsReportWorkspace(searchParams, { sort }))} /><SortableHeader className="w-[11%]" label="Referans No" field="reference" sort={workspace.sort} onChange={(sort) => setSearchParams(setGoodsReportWorkspace(searchParams, { sort }))} /><SortableHeader className="w-[11%]" label="Plaka / Şoför" field="driver" sort={workspace.sort} onChange={(sort) => setSearchParams(setGoodsReportWorkspace(searchParams, { sort }))} /></tr></thead><tbody>{paginatedMovements.map((movement) => <GoodsRecordRow key={movement.id} movement={movement} onOpen={(row) => { detailTriggerRef.current = row; setSelectedMovement(movement) }} />)}{Array.from({ length: Math.max(0, GOODS_REPORT_PAGE_SIZE - paginatedMovements.length) }).map((_, index) => <GoodsReportFillerRow key={`goods-filler-${index}`} />)}</tbody></table></div></div><div className="shrink-0"><ReportPagination page={page} pageCount={pageCount} visibleStart={visibleStart} visibleEnd={visibleEnd} total={recordMovements.length} visiblePageNumbers={getVisibleGoodsReportPageNumbers(page, pageCount)} onPageChange={(nextPage) => setSearchParams(setGoodsReportPage(searchParams, nextPage))} ariaLabel="Mal hareketi rapor sayfaları" /></div></>}</section><GoodsMovementDetailDialog movement={selectedMovement} open={selectedMovement !== null} onOpenChange={(open) => { if (!open) setSelectedMovement(null) }} returnFocusRef={detailTriggerRef} /></>

  return <section id="goods-analysis-card" className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-card p-3 shadow-panel" aria-labelledby="goods-analysis-title"><div className="flex shrink-0 flex-wrap items-start justify-between gap-2"><h2 id="goods-analysis-title" className="min-w-0 text-xs font-semibold uppercase tracking-wider text-slate-900">Mal Hareketi Analizi</h2>{!dateRangeInvalid && <p className="max-w-full text-right text-[11px] tabular-nums text-slate-500">{metadata}</p>}</div><div className="mt-2 min-h-0 flex-1">{dateRangeInvalid ? <EmptyState title="Geçersiz tarih aralığı" description="Başlangıç tarihi bitiş tarihinden sonra olamaz." /> : hasComparisonData && previousTrend ? <div className="flex h-full min-h-0 flex-col gap-1.5"><TrendPanel points={trend} yAxisMax={sharedAxis?.max} yAxisTicks={sharedAxis?.ticks} /><TrendPanel label={comparisonLabel} points={previousTrend} yAxisMax={sharedAxis?.max} yAxisTicks={sharedAxis?.ticks} /></div> : <GoodsMovementTrendChart points={trend} />}</div>{!dateRangeInvalid && <div className="mt-1.5 flex shrink-0 items-start justify-between gap-4 border-t border-slate-100 pt-1.5"><p className="min-w-0 text-xs leading-snug text-slate-700">{insight}</p><GoodsMovementTrendLegend /></div>}</section>
})

function TrendPanel({ label, points, yAxisMax, yAxisTicks }: { label?: string; points: import("@/features/reports/goods-report-utils").GoodsMovementTrendPoint[]; yAxisMax?: number; yAxisTicks?: number[] }) { return <div className="flex min-h-0 flex-1 flex-col">{label && <p className="report-png-comparison-label mb-0.5 shrink-0 truncate text-[11px] font-medium uppercase tracking-[0.02em] text-slate-500">{label}</p>}<div className="min-h-0 flex-1"><GoodsMovementTrendChart points={points} yAxisMax={yAxisMax} yAxisTicks={yAxisTicks} /></div></div> }
function GoodsRecordRow({ movement, onOpen }: { movement: GoodsMovement; onOpen(row: HTMLTableRowElement): void }) { const status = getGoodsMovementDisplayStatus(movement); return <tr tabIndex={0} aria-haspopup="dialog" aria-label={`${movement.counterpartyName} mal hareketi detayını aç`} className="record-row-hover h-[3.375rem] cursor-pointer border-b last:border-b-0 transition-colors hover:bg-slate-50/80 focus-visible:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500" onClick={(event) => onOpen(event.currentTarget)} onKeyDown={(event) => { if (!isGoodsRecordActivationKey(event.key)) return; event.preventDefault(); onOpen(event.currentTarget) }}><td className="px-3 py-1 font-medium">{getGoodsDirectionLabel(movement.direction)}</td><td className="px-3 py-1"><p className="truncate" title={movement.companyName}>{movement.companyName}</p><p className="mt-0.5 truncate text-[10px] text-slate-500" title={movement.facilityName}>{movement.facilityName}</p></td><td className="px-3 py-1"><p className="truncate" title={movement.counterpartyName}>{movement.counterpartyName}</p></td><td className="px-3 py-1 tabular-nums">{formatTr(new Date(`${movement.plannedDate}T12:00:00`), "d MMM yyyy")}{movement.plannedTime ? ` · ${movement.plannedTime}` : ""}</td><td className="px-3 py-1 tabular-nums">{movement.actualAt ? formatTr(new Date(movement.actualAt), "d MMM HH:mm") : "—"}</td><td className="px-3 py-1"><span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${statusBadgeClass[status]}`}>{GOODS_REPORT_STATUS_LABELS[status]}</span></td><td className="px-3 py-1"><p className="truncate" title={movement.referenceNumber}>{movement.referenceNumber ?? "—"}</p></td><td className="px-3 py-1"><p className="truncate" title={`${movement.actualPlate ?? "—"} / ${movement.actualDriverName ?? "—"}`}>{movement.actualPlate || movement.actualDriverName ? `${movement.actualPlate ?? "—"} / ${movement.actualDriverName ?? "—"}` : "—"}</p></td></tr> }
function GoodsReportFillerRow() { return <tr aria-hidden="true" className="pointer-events-none h-[3.375rem] select-none border-b border-transparent last:border-b-0"><td className="px-3 py-1" /><td className="px-3 py-1" /><td className="px-3 py-1" /><td className="px-3 py-1" /><td className="px-3 py-1" /><td className="px-3 py-1" /><td className="px-3 py-1" /><td className="px-3 py-1" /></tr> }
function EmptyState({ title, description, showSearch = false }: { title: string; description: string; showSearch?: boolean }) { return <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 text-center">{showSearch && <Search className="size-6 text-slate-400" />}<p className={`${showSearch ? "mt-2" : ""} text-xs font-semibold text-slate-900`}>{title}</p><p className="mt-0.5 text-[11px] text-slate-600">{description}</p></div> }
function SortableHeader({ className, label, field, sort, onChange }: { className: string; label: string; field: GoodsReportSortField; sort: import("@/lib/sort").SingleSortState<GoodsReportSortField>; onChange(sort: import("@/lib/sort").SingleSortState<GoodsReportSortField>): void }) { const active = sort?.field === field; const Icon = sort?.direction === "asc" ? ArrowUp : ArrowDown; return <th className={`${className} px-3 py-1.5`} aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}><button type="button" className="inline-flex cursor-pointer items-center gap-1 rounded-sm transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-300" aria-label={active ? `${label} sütunu sıralamasını kaldır` : `${label} sütununu artan sırala`} onClick={() => onChange(toggleSingleSort(sort, field))}>{label}{active && <Icon className="size-3" aria-hidden="true" />}</button></th> }

import { parse } from "date-fns"
import { ArrowDown, ArrowUp, ChevronDown, Search } from "lucide-react"
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react"

import type { Visit } from "@/domain/visits"
import {
  buildVisitsReportRows,
  downloadReportCsv,
  downloadReportExcel,
  downloadReportPdf,
  VISITS_REPORT_COLUMNS,
  type ReportExportHandle,
} from "@/features/reports/report-export"
import { formatDurationMinutes } from "@/features/reports/report-format"
import { ReportPagination } from "@/features/reports/ReportPagination"
import { getPreviousPeriod, type ReportsScopeFilters } from "@/features/reports/reports-filters"
import {
  buildVisitsReportSummarySentences,
  calculateSharedTrendYAxisMax,
  calculateVisitsReportChangePercent,
  calculateVisitsReportDailyTrendWithStatus,
  calculateVisitsReportKpis,
  calculateVisitsReportStatusCounts,
  filterVisitsForReport,
  findVisitsReportBusiestDay,
  getReportPageCount,
  getVisibleReportPageNumbers,
  getVisitDelayMinutes,
  getVisitDurationMinutes,
  getVisitReportStatusGroup,
  groupVisitsReportDailyTrendByOutcome,
  paginateReportVisits,
  VISITS_REPORT_STATUS_COLORS,
  VISITS_REPORT_STATUS_LABELS,
  type VisitsReportPeriodSummaryInput,
} from "@/features/reports/visits-report-utils"
import { VisitsTrendChart } from "@/features/reports/VisitsTrendChart"
import { formatTr } from "@/lib/date"

// Comparison mode halves each chart's width (side by side), so thin the x-axis further than the
// single-chart default to avoid crowding.
const COMPARISON_MAX_X_AXIS_TICKS = 5

// Estimates used to size the records table to whatever height the 60/40 split actually leaves it,
// without ever producing an internal scrollbar. Deliberately generous (a two-line "+X dk" late
// row is closer to 46px than a single-line row's ~33px) so the computed row count undershoots
// rather than clips a partially-visible last row.
const RECORD_ROW_HEIGHT_PX = 40
const RECORD_TABLE_HEADER_HEIGHT_PX = 32
const MIN_RECORDS_PAGE_SIZE = 3
const DEFAULT_RECORDS_PAGE_SIZE = 6

// Direction is purely descriptive (which way the number moved), not a value judgment — an
// increase in "Geç Giriş" is not rendered as positive, so no color is attached to either
// direction, only a neutral arrow.
interface MetricDelta {
  direction: "up" | "down" | "flat"
  label: string
}

function percentDelta(changePercent: number | null): MetricDelta | null {
  if (changePercent === null) return null
  if (changePercent === 0) return { direction: "flat", label: "Değişim yok" }
  return { direction: changePercent > 0 ? "up" : "down", label: `%${Math.abs(changePercent)}` }
}

function durationDelta(currentMinutes: number | null, previousMinutes: number | null): MetricDelta | null {
  if (currentMinutes === null || previousMinutes === null) return null
  const diff = currentMinutes - previousMinutes
  if (diff === 0) return { direction: "flat", label: "Değişim yok" }
  // Magnitude only — the arrow already conveys direction, so the label shouldn't repeat it as a sign.
  return { direction: diff > 0 ? "up" : "down", label: formatDurationMinutes(Math.abs(diff)) }
}

function formatRangeLabel(filters: ReportsScopeFilters) {
  if (!filters.startDate || !filters.endDate) return "Tüm tarihler"
  const start = parse(filters.startDate, "yyyy-MM-dd", new Date())
  const end = parse(filters.endDate, "yyyy-MM-dd", new Date())
  return `${formatTr(start, "d MMM yyyy")} – ${formatTr(end, "d MMM yyyy")}`
}

export const VisitsReportTab = forwardRef<ReportExportHandle, { visits: Visit[]; filters: ReportsScopeFilters; dateRangeInvalid: boolean; comparisonEnabled?: boolean; onExportAvailabilityChange?(canExport: boolean): void }>(function VisitsReportTab({ visits, filters, dateRangeInvalid, comparisonEnabled = false, onExportAvailabilityChange }, ref) {
  const reportVisits = useMemo(() => filterVisitsForReport(visits, filters), [filters, visits])
  const kpis = useMemo(() => calculateVisitsReportKpis(reportVisits), [reportVisits])
  const statusCounts = useMemo(() => calculateVisitsReportStatusCounts(reportVisits), [reportVisits])
  const busiestDay = useMemo(() => findVisitsReportBusiestDay(reportVisits), [reportVisits])
  const dailyTrendWithStatus = useMemo(() => calculateVisitsReportDailyTrendWithStatus(reportVisits, filters), [reportVisits, filters])
  const dailyTrendGrouped = useMemo(() => groupVisitsReportDailyTrendByOutcome(dailyTrendWithStatus), [dailyTrendWithStatus])
  const headers = useMemo(() => VISITS_REPORT_COLUMNS.map((column) => column.header), [])
  const exportFilenameBase = `ziyaretler-raporu_${filters.startDate || "tumu"}_${filters.endDate || "tumu"}`

  const previousFilters = useMemo(() => {
    if (!comparisonEnabled) return null
    const previousRange = getPreviousPeriod(filters)
    return previousRange ? { ...filters, ...previousRange } : null
  }, [comparisonEnabled, filters])
  const previousReportVisits = useMemo(() => previousFilters ? filterVisitsForReport(visits, previousFilters) : null, [previousFilters, visits])
  const previousSummary = useMemo<VisitsReportPeriodSummaryInput | null>(() => {
    if (!previousReportVisits) return null
    return {
      kpis: calculateVisitsReportKpis(previousReportVisits),
      statusCounts: calculateVisitsReportStatusCounts(previousReportVisits),
      busiestDay: findVisitsReportBusiestDay(previousReportVisits),
    }
  }, [previousReportVisits])
  const previousDailyTrendGrouped = useMemo(() => {
    if (!previousFilters || !previousReportVisits) return null
    return groupVisitsReportDailyTrendByOutcome(calculateVisitsReportDailyTrendWithStatus(previousReportVisits, previousFilters))
  }, [previousFilters, previousReportVisits])
  const showComparisonCharts = comparisonEnabled && previousFilters !== null && previousDailyTrendGrouped !== null
  const sharedYAxisMax = useMemo(
    () => showComparisonCharts && previousDailyTrendGrouped ? calculateSharedTrendYAxisMax(dailyTrendGrouped, previousDailyTrendGrouped) : undefined,
    [showComparisonCharts, dailyTrendGrouped, previousDailyTrendGrouped],
  )

  const totalDelta = previousSummary ? percentDelta(calculateVisitsReportChangePercent(kpis.total, previousSummary.kpis.total)) : null
  const checkedInDelta = previousSummary ? percentDelta(calculateVisitsReportChangePercent(kpis.actuallyCheckedIn, previousSummary.kpis.actuallyCheckedIn)) : null
  const avgDurationDelta = previousSummary ? durationDelta(kpis.averageDurationMinutes, previousSummary.kpis.averageDurationMinutes) : null
  const lateDelta = previousSummary ? percentDelta(calculateVisitsReportChangePercent(kpis.lateArrivals, previousSummary.kpis.lateArrivals)) : null

  const summaryText = useMemo(
    () => buildVisitsReportSummarySentences({ kpis, statusCounts, busiestDay }, previousSummary).join(" "),
    [kpis, statusCounts, busiestDay, previousSummary],
  )

  const recordsWrapperRef = useRef<HTMLDivElement>(null)
  const [recordsPageSize, setRecordsPageSize] = useState(DEFAULT_RECORDS_PAGE_SIZE)
  const [recordsPage, setRecordsPage] = useState(1)
  const recordsPageCount = getReportPageCount(reportVisits.length, recordsPageSize)
  const paginatedVisits = useMemo(() => paginateReportVisits(reportVisits, recordsPage, recordsPageSize), [reportVisits, recordsPage, recordsPageSize])
  const recordsVisibleStart = reportVisits.length === 0 ? 0 : (recordsPage - 1) * recordsPageSize + 1
  const recordsVisibleEnd = Math.min(recordsPage * recordsPageSize, reportVisits.length)

  // The wrapper's own box is fixed by the section's flex layout (flex-1 min-h-0), independent of
  // how many rows it holds, so measuring it here can't create a resize feedback loop.
  useLayoutEffect(() => {
    const wrapper = recordsWrapperRef.current
    if (!wrapper) return

    const measure = () => {
      const available = wrapper.clientHeight - RECORD_TABLE_HEADER_HEIGHT_PX
      setRecordsPageSize(Math.max(MIN_RECORDS_PAGE_SIZE, Math.floor(available / RECORD_ROW_HEIGHT_PX)))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setRecordsPage(1)
  }, [filters])

  useEffect(() => {
    if (recordsPage > recordsPageCount) setRecordsPage(Math.max(1, recordsPageCount))
  }, [recordsPage, recordsPageCount])

  useEffect(() => {
    onExportAvailabilityChange?.(reportVisits.length > 0)
  }, [onExportAvailabilityChange, reportVisits.length])

  const exportRows = () => buildVisitsReportRows(reportVisits)

  useImperativeHandle(ref, () => ({
    exportCsv: () => downloadReportCsv(headers, exportRows(), `${exportFilenameBase}.csv`),
    exportExcel: () => { void downloadReportExcel("Ziyaretler", headers, exportRows(), `${exportFilenameBase}.xlsx`) },
    exportPdf: () => { void downloadReportPdf("Ziyaretler Raporu", headers, exportRows(), `${exportFilenameBase}.pdf`) },
  }))

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <section className="flex min-h-0 flex-[3] flex-col overflow-hidden rounded-lg border bg-card p-3 shadow-panel" aria-labelledby="visits-analysis-title">
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 id="visits-analysis-title" className="text-xs font-semibold uppercase tracking-wider text-slate-900">Ziyaret Analizi</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">{formatRangeLabel(filters)}</p>
          </div>
          <button
            type="button"
            disabled
            title="Yakında: periyot seçimi"
            className="flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 shadow-none disabled:cursor-not-allowed disabled:opacity-100"
          >
            Günlük
            <ChevronDown className="size-3 text-slate-400" />
          </button>
        </div>

        <div className="mt-2 min-h-0 flex-1">
          {dateRangeInvalid ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <p className="text-sm font-semibold text-slate-900">Geçersiz tarih aralığı</p>
              <p className="mt-1 text-xs text-slate-600">Başlangıç tarihi bitiş tarihinden sonra olamaz.</p>
            </div>
          ) : comparisonEnabled && previousFilters && previousDailyTrendGrouped ? (
            <div className="grid h-full grid-cols-2 gap-3">
              <div className="flex h-full min-h-0 flex-col">
                <p className="mb-1 shrink-0 truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">Seçili dönem · {formatRangeLabel(filters)}</p>
                <div className="min-h-0 flex-1">
                  <VisitsTrendChart points={dailyTrendGrouped} yAxisMax={sharedYAxisMax} maxXAxisTicks={COMPARISON_MAX_X_AXIS_TICKS} />
                </div>
              </div>
              <div className="flex h-full min-h-0 flex-col">
                <p className="mb-1 shrink-0 truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">Önceki dönem · {formatRangeLabel(previousFilters)}</p>
                <div className="min-h-0 flex-1">
                  <VisitsTrendChart points={previousDailyTrendGrouped} yAxisMax={sharedYAxisMax} showLegend={false} maxXAxisTicks={COMPARISON_MAX_X_AXIS_TICKS} />
                </div>
              </div>
            </div>
          ) : (
            <VisitsTrendChart points={dailyTrendGrouped} />
          )}
        </div>

        {!dateRangeInvalid && (
          <p className="mt-2 shrink-0 text-xs leading-snug text-slate-700">{summaryText}</p>
        )}

        <dl className="mt-2 shrink-0 grid grid-cols-2 gap-y-2 border-t border-slate-100 pt-2 sm:grid-cols-4 sm:divide-x sm:divide-slate-100" aria-label="Ziyaret analiz metrikleri">
          <ReportMetric label="Toplam Ziyaret" value={String(kpis.total)} delta={comparisonEnabled ? totalDelta : null} />
          <ReportMetric label="Gerçekleşen Ziyaret" value={String(kpis.actuallyCheckedIn)} delta={comparisonEnabled ? checkedInDelta : null} />
          <ReportMetric label="Ort. Ziyaret Süresi" value={formatDurationMinutes(kpis.averageDurationMinutes)} delta={comparisonEnabled ? avgDurationDelta : null} />
          <ReportMetric label="Geç Giriş" value={String(kpis.lateArrivals)} delta={comparisonEnabled ? lateDelta : null} />
        </dl>
      </section>

      <section className="flex min-h-0 flex-[2] flex-col overflow-hidden rounded-lg border bg-card shadow-panel" aria-labelledby="visits-records-title">
        <div className="flex shrink-0 items-center gap-1.5 border-b px-3 py-2">
          <h2 id="visits-records-title" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ziyaret Kayıtları</h2>
          <span className="text-[11px] tabular-nums text-slate-400">· {reportVisits.length} kayıt</span>
        </div>

        {dateRangeInvalid ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 text-center">
            <p className="text-sm font-semibold text-slate-900">Geçersiz tarih aralığı</p>
            <p className="mt-1 text-xs text-slate-600">Başlangıç tarihi bitiş tarihinden sonra olamaz.</p>
          </div>
        ) : reportVisits.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 text-center">
            <Search className="mx-auto size-6 text-slate-400" />
            <h3 className="mt-2 text-xs font-semibold text-slate-900">Eşleşen ziyaret bulunamadı</h3>
            <p className="mt-0.5 text-[11px] text-slate-600">Filtre ölçütlerini değiştirerek yeniden deneyin.</p>
          </div>
        ) : (
          <>
            <div ref={recordsWrapperRef} className="min-h-0 flex-1 overflow-hidden">
              <div className="h-full overflow-x-auto overflow-y-hidden scrollbar-thin">
                <table className="w-full min-w-[980px] table-fixed text-left text-xs">
                  <thead className="border-b bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="w-[10%] px-3 py-2">Tarih</th>
                      <th className="w-[15%] px-3 py-2">Ziyaretçi</th>
                      <th className="w-[14%] px-3 py-2">Firma</th>
                      <th className="w-[14%] px-3 py-2">Ziyaret Edilen</th>
                      <th className="w-[12%] px-3 py-2">Planlanan</th>
                      <th className="w-[13%] px-3 py-2">Gerçekleşen</th>
                      <th className="w-[9%] px-3 py-2">Süre</th>
                      <th className="w-[13%] px-3 py-2">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedVisits.map((visit) => (
                      <tr key={visit.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-3 py-2 tabular-nums">{formatTr(new Date(visit.plannedStart), "d MMM yyyy")}</td>
                        <td className="px-3 py-2">
                          <p className="truncate font-medium text-slate-900" title={`${visit.visitor.firstName} ${visit.visitor.lastName}`}>{visit.visitor.firstName} {visit.visitor.lastName}</p>
                        </td>
                        <td className="px-3 py-2"><p className="truncate" title={visit.visitor.company}>{visit.visitor.company}</p></td>
                        <td className="px-3 py-2"><p className="truncate" title={visit.hostEmployeeName}>{visit.hostEmployeeName}</p></td>
                        <td className="px-3 py-2 tabular-nums">{formatTr(new Date(visit.plannedStart), "HH:mm")}–{formatTr(new Date(visit.plannedEnd), "HH:mm")}</td>
                        <td className="px-3 py-2"><ActualTimesCell visit={visit} /></td>
                        <td className="px-3 py-2 tabular-nums">{formatDurationMinutes(getVisitDurationMinutes(visit))}</td>
                        <td className="px-3 py-2"><VisitsReportStatusPill status={visit.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="shrink-0">
              <ReportPagination
                page={recordsPage}
                pageCount={recordsPageCount}
                visibleStart={recordsVisibleStart}
                visibleEnd={recordsVisibleEnd}
                total={reportVisits.length}
                visiblePageNumbers={getVisibleReportPageNumbers(recordsPage, Math.max(1, recordsPageCount))}
                onPageChange={setRecordsPage}
                ariaLabel="Ziyaret kayıtları sayfaları"
              />
            </div>
          </>
        )}
      </section>
    </div>
  )
})

function ActualTimesCell({ visit }: { visit: Visit }) {
  if (!visit.actualCheckIn) return <span className="text-slate-400">—</span>

  const delay = getVisitDelayMinutes(visit)
  return (
    <div>
      <p className="tabular-nums">
        {formatTr(new Date(visit.actualCheckIn), "HH:mm")}–{visit.actualCheckOut ? formatTr(new Date(visit.actualCheckOut), "HH:mm") : "—"}
      </p>
      {delay !== null && delay > 0 && <p className="text-[10px] font-medium text-amber-600">+{delay} dk</p>}
    </div>
  )
}

function VisitsReportStatusPill({ status }: { status: Visit["status"] }) {
  const group = getVisitReportStatusGroup(status)
  const color = VISITS_REPORT_STATUS_COLORS[group]
  return (
    <span
      className="inline-flex w-fit items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}14`, color }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {VISITS_REPORT_STATUS_LABELS[group]}
    </span>
  )
}

function ReportMetric({ label, value, delta }: { label: string; value: string; delta?: MetricDelta | null }) {
  return (
    <div className="sm:px-3 sm:first:pl-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</dd>
      {delta && (
        <p className="mt-0.5 flex items-center gap-0.5 text-[10px] font-medium text-slate-500">
          {delta.direction === "up" && <ArrowUp className="size-3" />}
          {delta.direction === "down" && <ArrowDown className="size-3" />}
          {delta.label}
        </p>
      )}
    </div>
  )
}

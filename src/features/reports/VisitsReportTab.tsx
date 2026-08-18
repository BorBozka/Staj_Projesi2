import { Search, Timer, Users } from "lucide-react"
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react"

import type { Visit } from "@/domain/visits"
import { ReportPagination } from "@/features/reports/ReportPagination"
import {
  buildVisitsReportRows,
  downloadReportCsv,
  downloadReportExcel,
  downloadReportPdf,
  VISITS_REPORT_COLUMNS,
  type ReportExportHandle,
} from "@/features/reports/report-export"
import { formatDurationMinutes } from "@/features/reports/report-format"
import type { ReportsScopeFilters } from "@/features/reports/reports-filters"
import {
  calculateVisitsReportDailyTrend,
  calculateVisitsReportKpis,
  calculateVisitsReportStatusCounts,
  filterVisitsForReport,
  getReportPageCount,
  getVisibleReportPageNumbers,
  getVisitDelayMinutes,
  paginateReportVisits,
  VISITS_REPORT_PAGE_SIZE,
} from "@/features/reports/visits-report-utils"
import { VisitsStatusDonut } from "@/features/reports/VisitsStatusDonut"
import { VisitsTrendChart } from "@/features/reports/VisitsTrendChart"
import { VisitStatusBadge } from "@/features/visits/VisitStatusBadge"
import { formatTr } from "@/lib/date"

export const VisitsReportTab = forwardRef<ReportExportHandle, { visits: Visit[]; filters: ReportsScopeFilters; dateRangeInvalid: boolean; onExportAvailabilityChange?(canExport: boolean): void }>(function VisitsReportTab({ visits, filters, dateRangeInvalid, onExportAvailabilityChange }, ref) {
  const [page, setPage] = useState(1)

  const reportVisits = useMemo(() => filterVisitsForReport(visits, filters), [filters, visits])
  const kpis = useMemo(() => calculateVisitsReportKpis(reportVisits), [reportVisits])
  const statusCounts = useMemo(() => calculateVisitsReportStatusCounts(reportVisits), [reportVisits])
  const dailyTrend = useMemo(() => calculateVisitsReportDailyTrend(reportVisits, filters), [reportVisits, filters])
  const pageCount = getReportPageCount(reportVisits.length)
  const paginatedVisits = paginateReportVisits(reportVisits, page)
  const visibleStart = reportVisits.length === 0 ? 0 : (page - 1) * VISITS_REPORT_PAGE_SIZE + 1
  const visibleEnd = Math.min(page * VISITS_REPORT_PAGE_SIZE, reportVisits.length)
  const headers = useMemo(() => VISITS_REPORT_COLUMNS.map((column) => column.header), [])
  const exportFilenameBase = `ziyaretler-raporu_${filters.startDate || "tumu"}_${filters.endDate || "tumu"}`

  useEffect(() => {
    setPage(1)
  }, [filters])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

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
    <div className="space-y-3">
      <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-[200px_minmax(220px,280px)_minmax(0,1fr)]" aria-label="Ziyaret rapor özeti">
        <div className="flex flex-col justify-center gap-2.5 rounded-lg border bg-card p-3 shadow-panel">
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700"><Users className="size-3.5" /></span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">Toplam Ziyaret</p>
              <p className="text-base font-semibold tabular-nums text-slate-900">{kpis.total}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><Timer className="size-3.5" /></span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">Ort. Ziyaret Süresi</p>
              <p className="text-base font-semibold tabular-nums text-slate-900">{formatDurationMinutes(kpis.averageDurationMinutes)}</p>
            </div>
          </div>
        </div>
        <VisitsStatusDonut counts={statusCounts} />
        <VisitsTrendChart points={dailyTrend} />
      </section>

      <section className="flex min-h-[26rem] flex-col justify-between overflow-hidden rounded-lg border bg-card shadow-panel" aria-label="Ziyaret rapor tablosu">
        {dateRangeInvalid ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
            <p className="text-sm font-semibold text-slate-900">Geçersiz tarih aralığı</p>
            <p className="mt-1 text-xs text-slate-600">Başlangıç tarihi bitiş tarihinden sonra olamaz.</p>
          </div>
        ) : reportVisits.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
            <Search className="mx-auto size-8 text-slate-400" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">Eşleşen ziyaret bulunamadı</h3>
            <p className="mt-1 text-xs text-slate-600">Filtre ölçütlerini değiştirerek yeniden deneyin.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[1180px] table-fixed text-left text-xs">
              <thead className="sticky top-0 z-10 border-b bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-[14%] px-3 py-2.5">Ziyaretçi</th>
                  <th className="w-[14%] px-3 py-2.5">Ziyaretçi Şirketi</th>
                  <th className="w-[13%] px-3 py-2.5">Ev Sahibi</th>
                  <th className="w-[10%] px-3 py-2.5">Tarih</th>
                  <th className="w-[10%] px-3 py-2.5">Planlanan Giriş-Çıkış</th>
                  <th className="w-[10%] px-3 py-2.5">Gerçek Giriş-Çıkış</th>
                  <th className="w-[11%] px-3 py-2.5">Durum</th>
                  <th className="w-[9%] px-3 py-2.5">Gecikme (dk)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedVisits.map((visit) => {
                  const delay = getVisitDelayMinutes(visit)
                  return (
                    <tr key={visit.id}>
                      <td className="px-3 py-2.5 sm:py-3">
                        <p className="truncate font-semibold text-slate-900" title={`${visit.visitor.firstName} ${visit.visitor.lastName}`}>{visit.visitor.firstName} {visit.visitor.lastName}</p>
                      </td>
                      <td className="px-3 py-2.5 sm:py-3">
                        <p className="truncate" title={visit.visitor.company}>{visit.visitor.company}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500" title={visit.facilityName}>{visit.facilityName}</p>
                      </td>
                      <td className="px-3 py-2.5 sm:py-3"><p className="truncate" title={visit.hostEmployeeName}>{visit.hostEmployeeName}</p></td>
                      <td className="px-3 py-2.5 tabular-nums sm:py-3">{formatTr(new Date(visit.plannedStart), "d MMM yyyy")}</td>
                      <td className="px-3 py-2.5 tabular-nums sm:py-3">{formatTr(new Date(visit.plannedStart), "HH:mm")}–{formatTr(new Date(visit.plannedEnd), "HH:mm")}</td>
                      <td className="px-3 py-2.5 tabular-nums sm:py-3">
                        {visit.actualCheckIn ? formatTr(new Date(visit.actualCheckIn), "HH:mm") : "—"}–{visit.actualCheckOut ? formatTr(new Date(visit.actualCheckOut), "HH:mm") : "—"}
                      </td>
                      <td className="px-3 py-2.5 sm:py-3"><VisitStatusBadge status={visit.status} compact /></td>
                      <td className="px-3 py-2.5 tabular-nums sm:py-3">{delay === null ? "—" : delay}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <ReportPagination
          page={page}
          pageCount={pageCount}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          total={reportVisits.length}
          visiblePageNumbers={getVisibleReportPageNumbers(page, Math.max(1, pageCount))}
          onPageChange={setPage}
          ariaLabel="Ziyaret rapor sayfaları"
        />
      </section>
    </div>
  )
})

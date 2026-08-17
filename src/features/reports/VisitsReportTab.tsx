import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import type { Visit } from "@/domain/visits"
import { ReportKpiCard } from "@/features/reports/ReportKpiCard"
import {
  buildVisitsReportRows,
  downloadReportCsv,
  downloadReportExcel,
  downloadReportPdf,
  VISITS_REPORT_COLUMNS,
} from "@/features/reports/report-export"
import { formatDurationMinutes } from "@/features/reports/report-format"
import type { ReportsScopeFilters } from "@/features/reports/reports-filters"
import {
  calculateVisitsReportKpis,
  filterVisitsForReport,
  getReportPageCount,
  getVisitDelayMinutes,
  paginateReportVisits,
  VISITS_REPORT_PAGE_SIZE,
} from "@/features/reports/visits-report-utils"
import { VisitStatusBadge } from "@/features/visits/VisitStatusBadge"
import { formatTr } from "@/lib/date"

export function VisitsReportTab({ visits, filters, dateRangeInvalid }: { visits: Visit[]; filters: ReportsScopeFilters; dateRangeInvalid: boolean }) {
  const [page, setPage] = useState(1)

  const reportVisits = useMemo(() => filterVisitsForReport(visits, filters), [filters, visits])
  const kpis = useMemo(() => calculateVisitsReportKpis(reportVisits), [reportVisits])
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

  const exportRows = () => buildVisitsReportRows(reportVisits)

  return (
    <div className="space-y-3">
      <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ziyaret rapor özeti">
        <ReportKpiCard label="Toplam Ziyaret" value={String(kpis.total)} />
        <ReportKpiCard label="Tamamlanan" value={String(kpis.completed)} hint={kpis.total > 0 ? `${Math.round((kpis.completed / kpis.total) * 100)}%` : undefined} />
        <ReportKpiCard label="No-show + İptal Oranı" value={`%${kpis.noShowCancelledRate.toFixed(1)}`} />
        <ReportKpiCard label="Ort. Ziyaret Süresi" value={formatDurationMinutes(kpis.averageDurationMinutes)} />
      </section>

      <section className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 shadow-panel" aria-label="Rapor dışa aktarma">
        <p className="text-xs text-slate-600 tabular-nums">{visibleStart}–{visibleEnd} / {reportVisits.length} kayıt</p>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={reportVisits.length === 0} onClick={() => downloadReportCsv(headers, exportRows(), `${exportFilenameBase}.csv`)}>
            <Download className="size-3.5" />CSV
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={reportVisits.length === 0} onClick={() => void downloadReportExcel("Ziyaretler", headers, exportRows(), `${exportFilenameBase}.xlsx`)}>
            <FileSpreadsheet className="size-3.5" />Excel
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={reportVisits.length === 0} onClick={() => void downloadReportPdf("Ziyaretler Raporu", headers, exportRows(), `${exportFilenameBase}.pdf`)}>
            <FileText className="size-3.5" />PDF
          </Button>
        </div>
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
                        <p className="truncate" title={visit.hostCompanyName}>{visit.hostCompanyName}</p>
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

        <div className="flex items-center justify-between gap-2 border-t bg-slate-50/50 px-3 py-2.5">
          <p className="text-xs tabular-nums text-slate-600">Sayfa {pageCount === 0 ? 0 : page} / {pageCount}</p>
          <nav className="flex items-center gap-1" aria-label="Ziyaret rapor sayfaları">
            <Button variant="outline" size="icon-sm" className="h-8 w-8 text-xs" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Önceki sayfa">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon-sm" className="h-8 w-8 text-xs" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} aria-label="Sonraki sayfa">
              <ChevronRight className="size-4" />
            </Button>
          </nav>
        </div>
      </section>
    </div>
  )
}

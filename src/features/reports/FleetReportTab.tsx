import { Search } from "lucide-react"
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react"

import type { PlannedTransportAssignment } from "@/domain/transport-assignments"
import type { Meeting, Visit } from "@/domain/visits"
import { formatTransportAssignmentSchedule } from "@/features/transport/transport-assignment-time"
import {
  calculateFleetReportKpis,
  filterAssignmentsForReport,
  FLEET_REPORT_PAGE_SIZE,
  getFleetReportPageCount,
  getRelatedRecordLabel,
  getVisibleFleetReportPageNumbers,
  paginateFleetReport,
} from "@/features/reports/fleet-report-utils"
import { ReportKpiCard } from "@/features/reports/ReportKpiCard"
import { ReportPagination } from "@/features/reports/ReportPagination"
import { formatDurationMinutes } from "@/features/reports/report-format"
import {
  buildFleetReportRows,
  downloadReportCsv,
  downloadReportExcel,
  downloadReportPdf,
  FLEET_REPORT_COLUMNS,
  type ReportExportHandle,
} from "@/features/reports/report-export"
import type { ReportsScopeFilters } from "@/features/reports/reports-filters"
import { transportAssignmentService } from "@/services"

export const FleetReportTab = forwardRef<ReportExportHandle, { meetings: Meeting[]; visits: Visit[]; filters: ReportsScopeFilters; dateRangeInvalid: boolean; onExportAvailabilityChange?(canExport: boolean): void }>(function FleetReportTab({ meetings, visits, filters, dateRangeInvalid, onExportAvailabilityChange }, ref) {
  const [assignments, setAssignments] = useState<PlannedTransportAssignment[]>([])
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    void transportAssignmentService.listAssignments().then((next) => { if (!cancelled) setAssignments(next) })
    return () => { cancelled = true }
  }, [])

  const reportAssignments = useMemo(() => filterAssignmentsForReport(assignments, filters), [assignments, filters])
  const kpis = useMemo(() => calculateFleetReportKpis(reportAssignments), [reportAssignments])
  const pageCount = getFleetReportPageCount(reportAssignments.length)
  const paginatedAssignments = paginateFleetReport(reportAssignments, page)
  const visibleStart = reportAssignments.length === 0 ? 0 : (page - 1) * FLEET_REPORT_PAGE_SIZE + 1
  const visibleEnd = Math.min(page * FLEET_REPORT_PAGE_SIZE, reportAssignments.length)
  const headers = useMemo(() => FLEET_REPORT_COLUMNS.map((column) => column.header), [])
  const exportFilenameBase = `arac-sofor-raporu_${filters.startDate || "tumu"}_${filters.endDate || "tumu"}`

  useEffect(() => {
    setPage(1)
  }, [filters])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  useEffect(() => {
    onExportAvailabilityChange?.(reportAssignments.length > 0)
  }, [onExportAvailabilityChange, reportAssignments.length])

  const exportRows = () => buildFleetReportRows(reportAssignments, meetings, visits)

  useImperativeHandle(ref, () => ({
    exportCsv: () => downloadReportCsv(headers, exportRows(), `${exportFilenameBase}.csv`),
    exportExcel: () => { void downloadReportExcel("Araç-Şoför", headers, exportRows(), `${exportFilenameBase}.xlsx`) },
    exportPdf: () => { void downloadReportPdf("Araç / Şoför Raporu", headers, exportRows(), `${exportFilenameBase}.pdf`) },
  }))

  return (
    <div className="space-y-3">
      <section aria-label="Araç / Şoför Analizi başlığı">
        <h2 className="text-lg font-semibold text-slate-900">ARAÇ / ŞOFÖR ANALİZİ</h2>
      </section>

      <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Araç / şoför rapor özeti">
        <ReportKpiCard label="Toplam Görev" value={String(kpis.total)} />
        <ReportKpiCard label="İptal Edilen" value={String(kpis.cancelled)} />
        <ReportKpiCard label="İptal Oranı" value={`%${kpis.cancelRate.toFixed(1)}`} />
        <ReportKpiCard label="Ort. Planlanan Süre" value={formatDurationMinutes(kpis.averagePlannedDurationMinutes)} />
      </section>

      <section className="flex min-h-[26rem] flex-col justify-between overflow-hidden rounded-lg border bg-card shadow-panel" aria-label="Araç / şoför rapor tablosu">
        {dateRangeInvalid ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
            <p className="text-sm font-semibold text-slate-900">Geçersiz tarih aralığı</p>
            <p className="mt-1 text-xs text-slate-600">Başlangıç tarihi bitiş tarihinden sonra olamaz.</p>
          </div>
        ) : reportAssignments.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
            <Search className="mx-auto size-8 text-slate-400" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">Eşleşen araç görevi bulunamadı</h3>
            <p className="mt-1 text-xs text-slate-600">Filtre ölçütlerini değiştirerek yeniden deneyin.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[1180px] table-fixed text-left text-xs">
              <thead className="sticky top-0 z-10 border-b bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-[16%] px-3 py-2.5">Amaç</th>
                  <th className="w-[14%] px-3 py-2.5">Araç</th>
                  <th className="w-[12%] px-3 py-2.5">Şoför</th>
                  <th className="w-[14%] px-3 py-2.5">Şirket / Tesis</th>
                  <th className="w-[16%] px-3 py-2.5">Planlanan Başlangıç - Bitiş</th>
                  <th className="w-[10%] px-3 py-2.5">Durum</th>
                  <th className="w-[18%] px-3 py-2.5">İlişkili Ziyaret / Toplantı</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td className="px-3 py-2.5 sm:py-3"><p className="truncate" title={assignment.purpose}>{assignment.purpose}</p></td>
                    <td className="px-3 py-2.5 sm:py-3">
                      <p className="truncate font-semibold text-slate-900" title={assignment.vehicleName}>{assignment.vehicleName}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">{assignment.vehicleLicensePlate}</p>
                    </td>
                    <td className="px-3 py-2.5 sm:py-3"><p className="truncate" title={assignment.driverName}>{assignment.driverName}</p></td>
                    <td className="px-3 py-2.5 sm:py-3">
                      <p className="truncate" title={assignment.companyName}>{assignment.companyName}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500" title={assignment.facilityName}>{assignment.facilityName}</p>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums sm:py-3">{formatTransportAssignmentSchedule(assignment, true)}</td>
                    <td className="px-3 py-2.5 sm:py-3">
                      <span className={assignment.status === "ACTIVE" ? "rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700" : "rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600"}>
                        {assignment.status === "ACTIVE" ? "Aktif" : "İptal"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 sm:py-3"><p className="truncate" title={getRelatedRecordLabel(assignment, meetings, visits)}>{getRelatedRecordLabel(assignment, meetings, visits)}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ReportPagination
          page={page}
          pageCount={pageCount}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          total={reportAssignments.length}
          visiblePageNumbers={getVisibleFleetReportPageNumbers(page, Math.max(1, pageCount))}
          onPageChange={setPage}
          ariaLabel="Araç / şoför rapor sayfaları"
        />
      </section>
    </div>
  )
})

import { Search } from "lucide-react"
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react"

import { getGoodsDirectionLabel, getGoodsMovementDisplayStatus, type GoodsMovement } from "@/domain/goods-movements"
import {
  calculateGoodsReportKpis,
  filterGoodsMovementsForReport,
  getGoodsReportPageCount,
  getVisibleGoodsReportPageNumbers,
  GOODS_REPORT_PAGE_SIZE,
  GOODS_REPORT_STATUS_LABELS,
  paginateGoodsReport,
} from "@/features/reports/goods-report-utils"
import { ReportKpiCard } from "@/features/reports/ReportKpiCard"
import { ReportPagination } from "@/features/reports/ReportPagination"
import {
  buildGoodsReportRows,
  downloadReportCsv,
  downloadReportExcel,
  downloadReportPdf,
  GOODS_REPORT_COLUMNS,
  type ReportExportHandle,
} from "@/features/reports/report-export"
import type { ReportsScopeFilters } from "@/features/reports/reports-filters"
import { formatTr } from "@/lib/date"
import { goodsMovementService } from "@/services"

const statusBadgeClass: Record<ReturnType<typeof getGoodsMovementDisplayStatus>, string> = {
  PLANNED: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-slate-200 text-slate-600",
  LATE: "bg-amber-50 text-amber-700",
}

export const GoodsReportTab = forwardRef<ReportExportHandle, { filters: ReportsScopeFilters; dateRangeInvalid: boolean; onExportAvailabilityChange?(canExport: boolean): void }>(function GoodsReportTab({ filters, dateRangeInvalid, onExportAvailabilityChange }, ref) {
  const [movements, setMovements] = useState<GoodsMovement[]>([])
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    void goodsMovementService.listGoodsMovements().then((next) => { if (!cancelled) setMovements(next) })
    return () => { cancelled = true }
  }, [])

  const reportMovements = useMemo(() => filterGoodsMovementsForReport(movements, filters), [movements, filters])
  const kpis = useMemo(() => calculateGoodsReportKpis(reportMovements), [reportMovements])
  const pageCount = getGoodsReportPageCount(reportMovements.length)
  const paginatedMovements = paginateGoodsReport(reportMovements, page)
  const visibleStart = reportMovements.length === 0 ? 0 : (page - 1) * GOODS_REPORT_PAGE_SIZE + 1
  const visibleEnd = Math.min(page * GOODS_REPORT_PAGE_SIZE, reportMovements.length)
  const headers = useMemo(() => GOODS_REPORT_COLUMNS.map((column) => column.header), [])
  const exportFilenameBase = `mal-hareketi-raporu_${filters.startDate || "tumu"}_${filters.endDate || "tumu"}`

  useEffect(() => {
    setPage(1)
  }, [filters])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  useEffect(() => {
    onExportAvailabilityChange?.(reportMovements.length > 0)
  }, [onExportAvailabilityChange, reportMovements.length])

  const exportRows = () => buildGoodsReportRows(reportMovements)

  useImperativeHandle(ref, () => ({
    exportCsv: () => downloadReportCsv(headers, exportRows(), `${exportFilenameBase}.csv`),
    exportExcel: () => { void downloadReportExcel("Mal Hareketi", headers, exportRows(), `${exportFilenameBase}.xlsx`) },
    exportPdf: () => { void downloadReportPdf("Mal Hareketi Raporu", headers, exportRows(), `${exportFilenameBase}.pdf`) },
  }))

  return (
    <div className="space-y-3">
      <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Mal hareketi rapor özeti">
        <ReportKpiCard label="Toplam Hareket" value={String(kpis.total)} />
        <ReportKpiCard label="Gelen" value={String(kpis.inbound)} />
        <ReportKpiCard label="Giden" value={String(kpis.outbound)} />
        <ReportKpiCard label="Geciken Oranı" value={`%${kpis.lateRate.toFixed(1)}`} />
      </section>

      <section className="flex min-h-[26rem] flex-col justify-between overflow-hidden rounded-lg border bg-card shadow-panel" aria-label="Mal hareketi rapor tablosu">
        {dateRangeInvalid ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
            <p className="text-sm font-semibold text-slate-900">Geçersiz tarih aralığı</p>
            <p className="mt-1 text-xs text-slate-600">Başlangıç tarihi bitiş tarihinden sonra olamaz.</p>
          </div>
        ) : reportMovements.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
            <Search className="mx-auto size-8 text-slate-400" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">Eşleşen mal hareketi bulunamadı</h3>
            <p className="mt-1 text-xs text-slate-600">Filtre ölçütlerini değiştirerek yeniden deneyin.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[1180px] table-fixed text-left text-xs">
              <thead className="sticky top-0 z-10 border-b bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-[9%] px-3 py-2.5">Yön</th>
                  <th className="w-[15%] px-3 py-2.5">Şirket / Tesis</th>
                  <th className="w-[15%] px-3 py-2.5">Karşı Taraf</th>
                  <th className="w-[13%] px-3 py-2.5">Planlanan Tarih / Saat</th>
                  <th className="w-[13%] px-3 py-2.5">Gerçek Zaman</th>
                  <th className="w-[10%] px-3 py-2.5">Durum</th>
                  <th className="w-[12%] px-3 py-2.5">Referans No</th>
                  <th className="w-[13%] px-3 py-2.5">Plaka / Şoför</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedMovements.map((movement) => {
                  const status = getGoodsMovementDisplayStatus(movement)
                  return (
                    <tr key={movement.id}>
                      <td className="px-3 py-2.5 font-medium sm:py-3">{getGoodsDirectionLabel(movement.direction)}</td>
                      <td className="px-3 py-2.5 sm:py-3">
                        <p className="truncate" title={movement.companyName}>{movement.companyName}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500" title={movement.facilityName}>{movement.facilityName}</p>
                      </td>
                      <td className="px-3 py-2.5 sm:py-3"><p className="truncate" title={movement.counterpartyName}>{movement.counterpartyName}</p></td>
                      <td className="px-3 py-2.5 tabular-nums sm:py-3">
                        {formatTr(new Date(`${movement.plannedDate}T12:00:00`), "d MMM yyyy")}{movement.plannedTime ? ` · ${movement.plannedTime}` : ""}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums sm:py-3">{movement.actualAt ? formatTr(new Date(movement.actualAt), "d MMM HH:mm") : "—"}</td>
                      <td className="px-3 py-2.5 sm:py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusBadgeClass[status]}`}>{GOODS_REPORT_STATUS_LABELS[status]}</span></td>
                      <td className="px-3 py-2.5 sm:py-3">{movement.referenceNumber ?? "—"}</td>
                      <td className="px-3 py-2.5 sm:py-3">{movement.actualPlate || movement.actualDriverName ? `${movement.actualPlate ?? "—"} / ${movement.actualDriverName ?? "—"}` : "—"}</td>
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
          total={reportMovements.length}
          visiblePageNumbers={getVisibleGoodsReportPageNumbers(page, Math.max(1, pageCount))}
          onPageChange={setPage}
          ariaLabel="Mal hareketi rapor sayfaları"
        />
      </section>
    </div>
  )
})

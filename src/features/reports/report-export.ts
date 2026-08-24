import { getGoodsDirectionLabel, getGoodsMovementDisplayStatus, type GoodsMovement } from "@/domain/goods-movements"
import type { PlannedTransportAssignment } from "@/domain/transport-assignments"
import type { Meeting, Visit } from "@/domain/visits"
import { formatTransportAssignmentSchedule } from "@/features/transport/transport-assignment-time"
import { getRelatedRecordLabel } from "@/features/reports/fleet-report-utils"
import { GOODS_REPORT_STATUS_LABELS } from "@/features/reports/goods-report-utils"
import { getVisitDelayMinutes, getVisitReportStatusGroup, VISITS_REPORT_STATUS_LABELS } from "@/features/reports/visits-report-utils"
import { formatTr } from "@/lib/date"

export interface ReportColumn {
  key: string
  header: string
}

// Exposed via ref from each report tab so the single "Dışa Aktar" dropdown fixed at the
// Reports tab row can trigger the active tab's own export handlers unchanged.
export interface ReportExportHandle {
  exportCsv(): void
  exportExcel(): void
  exportPdf(): void
}

// Single source of truth for the Visits report table, CSV, Excel, and PDF exports —
// keeps the on-screen table and every export format aligned to the same column set.
export const VISITS_REPORT_COLUMNS: ReportColumn[] = [
  { key: "visitor", header: "Ziyaretçi" },
  { key: "visitorCompany", header: "Ziyaretçi Şirketi" },
  { key: "host", header: "Ev Sahibi" },
  { key: "date", header: "Tarih" },
  { key: "plannedCheckIn", header: "Planlanan Giriş" },
  { key: "plannedCheckOut", header: "Planlanan Çıkış" },
  { key: "actualCheckIn", header: "Gerçek Giriş" },
  { key: "actualCheckOut", header: "Gerçek Çıkış" },
  { key: "status", header: "Durum" },
  { key: "delayMinutes", header: "Gecikme (dk)" },
]

export function buildVisitsReportRows(visits: Visit[]): string[][] {
  return visits.map((visit) => {
    const delay = getVisitDelayMinutes(visit)
    return [
      `${visit.visitor.firstName} ${visit.visitor.lastName}`,
      visit.visitor.company,
      visit.hostEmployeeName,
      formatTr(new Date(visit.plannedStart), "d MMM yyyy"),
      formatTr(new Date(visit.plannedStart), "HH:mm"),
      formatTr(new Date(visit.plannedEnd), "HH:mm"),
      visit.actualCheckIn ? formatTr(new Date(visit.actualCheckIn), "HH:mm") : "—",
      visit.actualCheckOut ? formatTr(new Date(visit.actualCheckOut), "HH:mm") : "—",
      VISITS_REPORT_STATUS_LABELS[getVisitReportStatusGroup(visit.status)],
      delay === null ? "—" : String(delay),
    ]
  })
}

// Single source of truth for the Araç/Şoför report table, CSV, Excel, and PDF exports.
export const FLEET_REPORT_COLUMNS: ReportColumn[] = [
  { key: "purpose", header: "Amaç" },
  { key: "vehicle", header: "Araç" },
  { key: "driver", header: "Şoför" },
  { key: "companyFacility", header: "Şirket / Tesis" },
  { key: "planned", header: "Planlanan Başlangıç - Bitiş" },
  { key: "status", header: "Durum" },
  { key: "related", header: "İlişkili Ziyaret / Toplantı" },
]

export function buildFleetReportRows(assignments: PlannedTransportAssignment[], meetings: Meeting[], visits: Visit[]): string[][] {
  return assignments.map((assignment) => [
    assignment.purpose,
    `${assignment.vehicleName} · ${assignment.vehicleLicensePlate}`,
    assignment.driverName,
    `${assignment.companyName} · ${assignment.facilityName}`,
    formatTransportAssignmentSchedule(assignment, true),
    assignment.status === "ACTIVE" ? "Aktif" : "İptal",
    getRelatedRecordLabel(assignment, meetings, visits),
  ])
}

// Single source of truth for the Mal Hareketi report table, CSV, Excel, and PDF exports.
export const GOODS_REPORT_COLUMNS: ReportColumn[] = [
  { key: "direction", header: "Yön" },
  { key: "companyFacility", header: "Şirket / Tesis" },
  { key: "counterparty", header: "Karşı Taraf" },
  { key: "planned", header: "Planlanan Tarih / Saat" },
  { key: "actual", header: "Gerçek Zaman" },
  { key: "status", header: "Durum" },
  { key: "reference", header: "Referans No" },
  { key: "plateDriver", header: "Plaka / Şoför" },
]

export function buildGoodsReportRows(movements: GoodsMovement[]): string[][] {
  return movements.map((movement) => [
    getGoodsDirectionLabel(movement.direction),
    `${movement.companyName} · ${movement.facilityName}`,
    movement.counterpartyName,
    `${formatTr(new Date(`${movement.plannedDate}T12:00:00`), "d MMM yyyy")}${movement.plannedTime ? ` · ${movement.plannedTime}` : ""}`,
    movement.actualAt ? formatTr(new Date(movement.actualAt), "d MMM yyyy HH:mm") : "—",
    GOODS_REPORT_STATUS_LABELS[getGoodsMovementDisplayStatus(movement)],
    movement.referenceNumber ?? "—",
    movement.actualPlate || movement.actualDriverName ? `${movement.actualPlate ?? "—"} / ${movement.actualDriverName ?? "—"}` : "—",
  ])
}

export function rowsToCsv(headers: string[], rows: string[][]): string {
  const escape = (value: string) => (/[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n")
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const UTF8_BOM = String.fromCharCode(0xfeff)

export function downloadReportCsv(headers: string[], rows: string[][], filename: string) {
  // UTF-8 BOM keeps Excel from mangling Turkish characters when it opens the CSV directly.
  const blob = new Blob([UTF8_BOM + rowsToCsv(headers, rows)], { type: "text/csv;charset=utf-8;" })
  triggerBrowserDownload(blob, filename)
}

// xlsx and jspdf are dynamically imported so viewing the Reports page never pulls their
// ~700KB combined weight in — only clicking Excel/PDF export does.
export async function downloadReportExcel(sheetName: string, headers: string[], rows: string[][], filename: string) {
  const XLSX = await import("xlsx")
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, filename)
}

export async function downloadReportPdf(title: string, headers: string[], rows: string[][], filename: string) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
  const doc = new jsPDF({ orientation: "landscape" })
  doc.setFontSize(12)
  doc.text(title, 14, 12)
  autoTable(doc, { head: [headers], body: rows, startY: 16, styles: { fontSize: 8 } })
  doc.save(filename)
}

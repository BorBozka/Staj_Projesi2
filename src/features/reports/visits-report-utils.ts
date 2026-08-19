import { differenceInMinutes, eachDayOfInterval, parse } from "date-fns"

import type { Visit, VisitStatus } from "@/domain/visits"
import { filterVisits, type AllVisitsFilters } from "@/features/manager/all-visits-utils"
import { formatDurationMinutes } from "@/features/reports/report-format"
import type { ReportsScopeFilters } from "@/features/reports/reports-filters"
import { formatTr } from "@/lib/date"
import { getPageCount as getPageCountShared, paginate } from "@/lib/pagination"

export const VISITS_REPORT_PAGE_SIZE = 10

function toFullFilters(filters: ReportsScopeFilters): AllVisitsFilters {
  return {
    search: "",
    startDate: filters.startDate,
    endDate: filters.endDate,
    companyId: filters.companyId,
    facilityId: filters.facilityId,
    status: "all",
    visitTypeId: "all",
    hostEmployeeId: "all",
    additionalRequirement: "all",
  }
}

// Unlike Manager All Visits, reports must stay complete for audit purposes: NOT_SENT
// invitations are not excluded here, so this deliberately reuses filterVisits (the shared
// core) rather than filterAndSortVisits (which applies the All Visits operational exclusion).
export function filterVisitsForReport(visits: Visit[], filters: ReportsScopeFilters): Visit[] {
  const filtered = filterVisits(visits, toFullFilters(filters))
  return [...filtered].sort((left, right) => new Date(right.plannedStart).getTime() - new Date(left.plannedStart).getTime())
}

export function getVisitDelayMinutes(visit: Visit): number | null {
  if (!visit.actualCheckIn) return null
  return Math.max(0, differenceInMinutes(new Date(visit.actualCheckIn), new Date(visit.plannedStart)))
}

export function getVisitDurationMinutes(visit: Visit): number | null {
  if (!visit.actualCheckIn || !visit.actualCheckOut) return null
  return differenceInMinutes(new Date(visit.actualCheckOut), new Date(visit.actualCheckIn))
}

export interface VisitsReportKpis {
  total: number
  completed: number
  actuallyCheckedIn: number
  averageDurationMinutes: number | null
  lateArrivals: number
}

export function calculateVisitsReportKpis(visits: Visit[]): VisitsReportKpis {
  const total = visits.length
  const completed = visits.filter((visit) => visit.status === "CHECKED_OUT").length
  const actuallyCheckedIn = visits.filter((visit) => visit.actualCheckIn).length
  const lateArrivals = visits.filter((visit) => getVisitDelayMinutes(visit) !== null && getVisitDelayMinutes(visit)! > 0).length

  const durations = visits
    .map((visit) => getVisitDurationMinutes(visit))
    .filter((duration): duration is number => duration !== null)
  const averageDurationMinutes = durations.length === 0
    ? null
    : Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)

  return { total, completed, actuallyCheckedIn, averageDurationMinutes, lateArrivals }
}

export function paginateReportVisits(visits: Visit[], page: number, pageSize = VISITS_REPORT_PAGE_SIZE) {
  return paginate(visits, page, pageSize)
}

export function getReportPageCount(total: number, pageSize = VISITS_REPORT_PAGE_SIZE) {
  return getPageCountShared(total, pageSize)
}

export function getVisibleReportPageNumbers(page: number, pageCount: number) {
  const start = Math.max(1, Math.min(page - 1, pageCount - 2))
  return Array.from({ length: Math.min(3, pageCount) }, (_, index) => start + index)
}

const REPORT_STATUS_ORDER: VisitStatus[] = ["PLANNED", "CHECKED_IN", "CHECKED_OUT", "NO_SHOW", "CANCELLED"]

export interface VisitsReportStatusCount {
  status: VisitStatus
  count: number
}

export function calculateVisitsReportStatusCounts(visits: Visit[]): VisitsReportStatusCount[] {
  return REPORT_STATUS_ORDER.map((status) => ({
    status,
    count: visits.filter((visit) => visit.status === status).length,
  }))
}

export interface VisitsReportDailyTrendPoint {
  date: string
  label: string
  count: number
}

export interface VisitsReportDailyTrendWithStatusPoint {
  date: string
  label: string
  PLANNED: number
  CHECKED_IN: number
  CHECKED_OUT: number
  NO_SHOW: number
  CANCELLED: number
}

function toLocalDate(value: string) {
  return parse(value, "yyyy-MM-dd", new Date())
}

// Fills every day in the filter range with visitors when the range is bounded on both ends;
// falls back to only the days that actually have visits when either bound is left open, since
// an unbounded range has no natural day count to fill zeros for.
export function calculateVisitsReportDailyTrend(visits: Visit[], filters: ReportsScopeFilters): VisitsReportDailyTrendPoint[] {
  const countsByDay = new Map<string, number>()
  for (const visit of visits) {
    const day = formatTr(new Date(visit.plannedStart), "yyyy-MM-dd")
    countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1)
  }

  if (filters.startDate && filters.endDate) {
    return eachDayOfInterval({ start: toLocalDate(filters.startDate), end: toLocalDate(filters.endDate) }).map((day) => {
      const key = formatTr(day, "yyyy-MM-dd")
      return { date: key, label: formatTr(day, "d MMM"), count: countsByDay.get(key) ?? 0 }
    })
  }

  return [...countsByDay.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, count]) => ({ date, label: formatTr(new Date(`${date}T12:00:00`), "d MMM"), count }))
}

export function calculateVisitsReportDailyTrendWithStatus(visits: Visit[], filters: ReportsScopeFilters): VisitsReportDailyTrendWithStatusPoint[] {
  const countsByDayAndStatus = new Map<string, Record<VisitStatus, number>>()

  for (const visit of visits) {
    const day = formatTr(new Date(visit.plannedStart), "yyyy-MM-dd")
    if (!countsByDayAndStatus.has(day)) {
      countsByDayAndStatus.set(day, {
        PLANNED: 0,
        CHECKED_IN: 0,
        CHECKED_OUT: 0,
        NO_SHOW: 0,
        CANCELLED: 0,
      })
    }
    const dayStatus = countsByDayAndStatus.get(day)!
    dayStatus[visit.status]++
  }

  if (filters.startDate && filters.endDate) {
    return eachDayOfInterval({ start: toLocalDate(filters.startDate), end: toLocalDate(filters.endDate) }).map((day) => {
      const key = formatTr(day, "yyyy-MM-dd")
      const status = countsByDayAndStatus.get(key) ?? {
        PLANNED: 0,
        CHECKED_IN: 0,
        CHECKED_OUT: 0,
        NO_SHOW: 0,
        CANCELLED: 0,
      }
      return { date: key, label: formatTr(day, "d MMM"), ...status }
    })
  }

  return [...countsByDayAndStatus.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, status]) => ({
      date,
      label: formatTr(new Date(`${date}T12:00:00`), "d MMM"),
      ...status,
    }))
}

export interface VisitsReportDailyTrendGroupedPoint {
  date: string
  label: string
  PLANNED: number
  COMPLETED: number
  NO_SHOW: number
  CANCELLED: number
}

export type VisitsReportStatusGroup = "PLANNED" | "COMPLETED" | "NO_SHOW" | "CANCELLED"

// Reporting groups CHECKED_IN and CHECKED_OUT into a single "Gerçekleşti" outcome across the
// chart, the records table and the summary text; VisitRecord.status itself keeps the finer
// distinction for operational screens (VisitStatusBadge), this only affects report presentation.
const REPORT_STATUS_GROUP: Record<VisitStatus, VisitsReportStatusGroup> = {
  PLANNED: "PLANNED",
  CHECKED_IN: "COMPLETED",
  CHECKED_OUT: "COMPLETED",
  NO_SHOW: "NO_SHOW",
  CANCELLED: "CANCELLED",
}

export function getVisitReportStatusGroup(status: VisitStatus): VisitsReportStatusGroup {
  return REPORT_STATUS_GROUP[status]
}

// Single source of truth for report status color/label so the trend chart legend and the
// records table status pill always read as the same four outcomes.
export const VISITS_REPORT_STATUS_LABELS: Record<VisitsReportStatusGroup, string> = {
  PLANNED: "Planlandı",
  COMPLETED: "Gerçekleşti",
  NO_SHOW: "Gelişmedi",
  CANCELLED: "İptal",
}

export const VISITS_REPORT_STATUS_COLORS: Record<VisitsReportStatusGroup, string> = {
  PLANNED: "#94a3b8",
  COMPLETED: "#10b981",
  NO_SHOW: "#ef4444",
  CANCELLED: "#8b5cf6",
}

// Reporting groups CHECKED_IN and CHECKED_OUT into a single "Gerçekleşti" outcome so the chart
// reads as planned vs. completed vs. no-show vs. cancelled; VisitRecord.status itself keeps the
// finer distinction for operational screens, this only affects the report presentation.
export function groupVisitsReportDailyTrendByOutcome(points: VisitsReportDailyTrendWithStatusPoint[]): VisitsReportDailyTrendGroupedPoint[] {
  return points.map(({ date, label, PLANNED, CHECKED_IN, CHECKED_OUT, NO_SHOW, CANCELLED }) => ({
    date,
    label,
    PLANNED,
    COMPLETED: CHECKED_IN + CHECKED_OUT,
    NO_SHOW,
    CANCELLED,
  }))
}

// Shared Y-axis ceiling for the "selected period" and "previous period" trend charts, so a
// comparison reads honestly instead of each chart auto-scaling to its own data (which would
// make a smaller previous period look deceptively similar in bar height). Rounded up to the
// next multiple of 5 for a little headroom above the tallest stacked bar.
export function calculateSharedTrendYAxisMax(...pointGroups: VisitsReportDailyTrendGroupedPoint[][]): number {
  const rawMax = pointGroups.reduce((max, points) => {
    const groupMax = points.reduce((inner, point) => Math.max(inner, point.PLANNED + point.COMPLETED + point.NO_SHOW + point.CANCELLED), 0)
    return Math.max(max, groupMax)
  }, 0)
  return rawMax === 0 ? 5 : Math.ceil(rawMax / 5) * 5
}

export interface VisitsReportBusiestDay {
  date: string
  label: string
  count: number
}

// Ties resolve to the earliest date: entries are sorted chronologically first, then a strictly
// greater count is required to replace the running leader.
export function findVisitsReportBusiestDay(visits: Visit[]): VisitsReportBusiestDay | null {
  const countsByDay = new Map<string, number>()
  for (const visit of visits) {
    const day = formatTr(new Date(visit.plannedStart), "yyyy-MM-dd")
    countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1)
  }

  return [...countsByDay.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .reduce<VisitsReportBusiestDay | null>((best, [date, count]) => {
      if (best && count <= best.count) return best
      return { date, label: formatTr(new Date(`${date}T12:00:00`), "d MMM"), count }
    }, null)
}

// Percentage change from `previous` to `current`. Returns null when `previous` is zero and
// `current` isn't (division by zero would produce a misleading percentage); 0-to-0 reports as
// no change rather than being hidden.
export function calculateVisitsReportChangePercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}

export interface VisitsReportPeriodSummaryInput {
  kpis: VisitsReportKpis
  statusCounts: VisitsReportStatusCount[]
  busiestDay: VisitsReportBusiestDay | null
}

function getStatusCount(statusCounts: VisitsReportStatusCount[], status: VisitStatus): number {
  return statusCounts.find((item) => item.status === status)?.count ?? 0
}

function describeChange(changePercent: number | null): string {
  if (changePercent === null) return ""
  if (changePercent === 0) return ", önceki dönemle aynı seviyede"
  return changePercent > 0 ? `, önceki döneme göre %${changePercent} arttı` : `, önceki döneme göre %${Math.abs(changePercent)} azaldı`
}

// Minutes, not percent: a duration swing reads more clearly as "12 dakika uzadı" than as a
// percentage of an already-short average.
function describeDurationChange(currentMinutes: number, previousMinutes: number | null): string {
  if (previousMinutes === null) return ""
  const diff = currentMinutes - previousMinutes
  if (diff === 0) return ", önceki dönemle aynı"
  return `, önceki döneme göre ${formatDurationMinutes(Math.abs(diff))} ${diff > 0 ? "uzadı" : "kısaldı"}`
}

// Deterministic sentences built only from already-calculated period data — no external
// AI/LLM call. `previous` is null when comparison is off or the period has no natural previous
// range (open-ended filters); in that case comparison clauses are simply omitted.
export function buildVisitsReportSummarySentences(current: VisitsReportPeriodSummaryInput, previous: VisitsReportPeriodSummaryInput | null): string[] {
  if (current.kpis.total === 0) {
    return ["Seçili dönemde kayıtlı ziyaret bulunmuyor."]
  }

  const sentences: string[] = []

  const totalChange = previous ? calculateVisitsReportChangePercent(current.kpis.total, previous.kpis.total) : null
  sentences.push(`Seçili dönemde toplam ${current.kpis.total} ziyaret kaydı bulunuyor${describeChange(totalChange)}.`)

  if (current.busiestDay) {
    sentences.push(`En yoğun gün ${current.busiestDay.count} ziyaretle ${current.busiestDay.label} oldu.`)
  }

  sentences.push(`${current.kpis.actuallyCheckedIn} ziyaretçi tesise giriş yaptı.`)

  const noShow = getStatusCount(current.statusCounts, "NO_SHOW")
  const cancelled = getStatusCount(current.statusCounts, "CANCELLED")
  sentences.push(`${noShow} ziyaretçi gelmedi, ${cancelled} ziyaret iptal edildi.`)

  sentences.push(
    current.kpis.averageDurationMinutes === null
      ? "Tamamlanmış ziyaret bulunmadığından ortalama süre hesaplanamadı."
      : `Ortalama ziyaret süresi ${formatDurationMinutes(current.kpis.averageDurationMinutes)}${previous ? describeDurationChange(current.kpis.averageDurationMinutes, previous.kpis.averageDurationMinutes) : ""}.`,
  )

  const lateChange = previous ? calculateVisitsReportChangePercent(current.kpis.lateArrivals, previous.kpis.lateArrivals) : null
  sentences.push(`${current.kpis.lateArrivals} ziyaretçi planlanan saatten geç giriş yaptı${describeChange(lateChange)}.`)

  return sentences
}

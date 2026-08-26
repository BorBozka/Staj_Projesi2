import { differenceInCalendarDays, differenceInMinutes, eachDayOfInterval, parse } from "date-fns"

import type { Visit, VisitStatus } from "@/domain/visits"
import { filterVisits, type AllVisitsFilters } from "@/features/manager/all-visits-utils"
import type { ReportsScopeFilters } from "@/features/reports/reports-filters"
import { formatTr, getIstanbulHour } from "@/lib/date"
import { getPageCount as getPageCountShared, paginate } from "@/lib/pagination"
import { sortReportRecords, matchesReportSearch } from "@/features/reports/report-records-utils"
import type { SingleSortState } from "@/lib/sort"

export const VISITS_REPORT_PAGE_SIZE = 8
export type VisitsReportSortField = "date" | "visitor" | "company" | "host" | "planned" | "duration" | "status"

const VISITS_STATUS_SORT_ORDER: Record<VisitStatus, number> = { PLANNED: 0, CHECKED_IN: 1, CHECKED_OUT: 2, NO_SHOW: 3, CANCELLED: 4 }

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

export function searchVisitsReportRecords(visits: Visit[], search: string) {
  return visits.filter((visit) => matchesReportSearch(search, [
    `${visit.visitor.firstName} ${visit.visitor.lastName}`,
    visit.visitor.company,
    visit.hostEmployeeName,
  ]))
}

export function sortVisitsReportRecords(visits: Visit[], sort: SingleSortState<VisitsReportSortField>) {
  return sortReportRecords(visits, sort, (visit, field) => {
    if (field === "date" || field === "planned") return new Date(visit.plannedStart).getTime()
    if (field === "visitor") return `${visit.visitor.firstName} ${visit.visitor.lastName}`
    if (field === "company") return visit.visitor.company
    if (field === "host") return visit.hostEmployeeName
    if (field === "duration") return getVisitDurationMinutes(visit)
    return VISITS_STATUS_SORT_ORDER[visit.status]
  })
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

export function getReportPageRange(total: number, page: number, pageSize = VISITS_REPORT_PAGE_SIZE) {
  if (total === 0) return { start: 0, end: 0 }
  return {
    start: (page - 1) * pageSize + 1,
    end: Math.min(page * pageSize, total),
  }
}

export function getVisibleReportPageNumbers(page: number, pageCount: number) {
  const start = Math.max(1, Math.min(page - 1, pageCount - 2))
  return Array.from({ length: Math.min(3, pageCount) }, (_, index) => start + index)
}

export interface VisitsReportDailyTrendPoint {
  date: string
  label: string
  count: number
}

export interface VisitsReportDailyTrendWithStatusPoint {
  date: string
  label: string
  periodDayCount?: number
  PLANNED: number
  CHECKED_IN: number
  CHECKED_OUT: number
  NO_SHOW: number
  CANCELLED: number
}

export type VisitsReportTrendGranularity = "hourly" | "daily" | "weekly"

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
  periodDayCount?: number
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
  NO_SHOW: "Gerçekleşmedi",
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
  return points.map(({ date, label, periodDayCount, PLANNED, CHECKED_IN, CHECKED_OUT, NO_SHOW, CANCELLED }) => ({
    date,
    label,
    ...(periodDayCount ? { periodDayCount } : {}),
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
  return calculateVisitsTrendYAxis(rawMax).max
}

export interface VisitsTrendYAxis {
  max: number
  ticks: number[]
}

// Prefers even, human-readable grid steps (normally 4–6 ticks) over Recharts' uneven automatic values.
export function calculateVisitsTrendYAxis(rawMax: number): VisitsTrendYAxis {
  const candidates = [5, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100]
  const scale = rawMax > 100 ? Math.pow(10, Math.floor(Math.log10(rawMax)) - 1) : 1
  const max = (candidates.map((candidate) => candidate * scale).find((candidate) => candidate >= rawMax) ?? Math.ceil(rawMax / (100 * scale)) * 100 * scale) || 5
  const intervalCount = max % 5 === 0 ? 5 : 4
  const step = max / intervalCount
  return { max, ticks: Array.from({ length: intervalCount + 1 }, (_, index) => index * step) }
}

export interface VisitsTrendBarSizing {
  maxBarSize: number
  barCategoryGap: string
}

// One density rule is shared by hourly, daily and weekly modes; one bucket remains compact.
export function getVisitsTrendBarSizing(pointCount: number): VisitsTrendBarSizing {
  if (pointCount <= 1) return { maxBarSize: 24, barCategoryGap: "80%" }
  if (pointCount <= 7) return { maxBarSize: 28, barCategoryGap: "38%" }
  if (pointCount <= 14) return { maxBarSize: 22, barCategoryGap: "26%" }
  if (pointCount <= 31) return { maxBarSize: 16, barCategoryGap: "18%" }
  return { maxBarSize: 12, barCategoryGap: "12%" }
}

export interface VisitsReportDelta {
  difference: number
  label: string
}

// Comparison metadata is deliberately absolute and neutral; it does not imply good/bad
// direction and does not duplicate the same change as a percentage.
export function formatVisitsReportDelta(current: number, previous: number): VisitsReportDelta {
  const difference = current - previous
  const absolute = difference > 0 ? `+${difference}` : difference < 0 ? `−${Math.abs(difference)}` : "0"
  return { difference, label: absolute }
}

export interface VisitsReportPeriodSummaryInput {
  kpis: VisitsReportKpis
  trend?: VisitsReportDailyTrendGroupedPoint[]
}

function emptyStatusCounts(): Record<VisitStatus, number> {
  return { PLANNED: 0, CHECKED_IN: 0, CHECKED_OUT: 0, NO_SHOW: 0, CANCELLED: 0 }
}

// Today follows the report's planned-time semantics and the Dashboard's Istanbul wall-clock
// bucketing, while only retaining the operational span that actually contains visits.
export function calculateVisitsReportHourlyTrendWithStatus(visits: Visit[]): VisitsReportDailyTrendWithStatusPoint[] {
  const countsByHour = new Map<number, Record<VisitStatus, number>>()
  for (const visit of visits) {
    const hour = getIstanbulHour(visit.plannedStart)
    if (hour === null) continue
    const status = countsByHour.get(hour) ?? emptyStatusCounts()
    status[visit.status]++
    countsByHour.set(hour, status)
  }

  const hours = [...countsByHour.keys()].sort((left, right) => left - right)
  if (hours.length === 0) return []

  const firstHour = hours[0]
  const lastHour = hours[hours.length - 1]
  return Array.from({ length: lastHour - firstHour + 1 }, (_, index) => {
    const hour = firstHour + index
    return {
      date: `hour-${String(hour).padStart(2, "0")}`,
      label: `${String(hour).padStart(2, "0")}:00`,
      ...(countsByHour.get(hour) ?? emptyStatusCounts()),
    }
  })
}

// Groups the already-filtered daily data into consecutive seven-day windows anchored to the
// selected report start. This intentionally does not use calendar weeks: 18–24 August is one
// bucket, and a longer range continues as days 1–7, 8–14, 15–21, and so on.
export function calculateVisitsReportWeeklyTrendWithStatus(visits: Visit[], filters: ReportsScopeFilters): VisitsReportDailyTrendWithStatusPoint[] {
  const dailyPoints = calculateVisitsReportDailyTrendWithStatus(visits, filters)
  if (dailyPoints.length === 0) return []

  const anchor = toLocalDate(filters.startDate || dailyPoints[0].date)
  const weeks = new Map<number, { firstDate: string; lastDate: string; status: Record<VisitStatus, number> }>()
  for (const point of dailyPoints) {
    const day = toLocalDate(point.date)
    const bucketIndex = Math.floor(differenceInCalendarDays(day, anchor) / 7)
    if (bucketIndex < 0) continue
    const week = weeks.get(bucketIndex) ?? { firstDate: point.date, lastDate: point.date, status: emptyStatusCounts() }
    week.lastDate = point.date
    week.status.PLANNED += point.PLANNED
    week.status.CHECKED_IN += point.CHECKED_IN
    week.status.CHECKED_OUT += point.CHECKED_OUT
    week.status.NO_SHOW += point.NO_SHOW
    week.status.CANCELLED += point.CANCELLED
    weeks.set(bucketIndex, week)
  }

  return [...weeks.entries()].map(([bucketIndex, week]) => ({
    date: `week-${bucketIndex + 1}-${week.firstDate}`,
    label: `${formatTr(toLocalDate(week.firstDate), "d MMM")}–${formatTr(toLocalDate(week.lastDate), "d MMM")}`,
    periodDayCount: differenceInCalendarDays(toLocalDate(week.lastDate), toLocalDate(week.firstDate)) + 1,
    ...week.status,
  }))
}

export function getVisitsTrendTooltipPeriodContext(point: VisitsReportDailyTrendGroupedPoint | undefined): string | null {
  if (!point?.periodDayCount || point.periodDayCount >= 7) return null
  return `${point.periodDayCount} günlük dönem`
}

export function calculateVisitsReportTrendWithStatus(visits: Visit[], filters: ReportsScopeFilters, granularity: VisitsReportTrendGranularity): VisitsReportDailyTrendWithStatusPoint[] {
  if (granularity === "hourly") return calculateVisitsReportHourlyTrendWithStatus(visits)
  if (granularity === "weekly") return calculateVisitsReportWeeklyTrendWithStatus(visits, filters)
  return calculateVisitsReportDailyTrendWithStatus(visits, filters)
}

function describeMetricChange(label: string, current: number, previous: number): string | null {
  const difference = current - previous
  if (difference === 0) return null
  return `${label} ${Math.abs(difference)} ${difference > 0 ? "arttı" : "azaldı"}`
}

function formatDurationForSentence(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours === 0) return `${remainingMinutes} dakika`
  if (remainingMinutes === 0) return `${hours} saat`
  return `${hours} saat ${remainingMinutes} dakika`
}

function describeDurationChange(current: number | null, previous: number | null): string | null {
  if (current === null || previous === null) return null
  const difference = current - previous
  if (difference === 0) return null
  return `Ortalama ziyaret süresi ${formatDurationForSentence(Math.abs(difference))} ${difference > 0 ? "uzadı" : "kısaldı"}`
}

export type VisitsReportBusiestPeriodKind = "hour" | "day" | "period"

export interface VisitsReportBusiestPeriods {
  kind: VisitsReportBusiestPeriodKind
  labels: string[]
  tiedCount: number
  maxCount: number
}

const MAX_LISTED_BUSY_PERIODS = 3

function getTrendPointTotal(point: VisitsReportDailyTrendGroupedPoint): number {
  return point.PLANNED + point.COMPLETED + point.NO_SHOW + point.CANCELLED
}

export function findVisitsReportBusiestPeriods(trend: VisitsReportDailyTrendGroupedPoint[]): VisitsReportBusiestPeriods | null {
  const maxCount = trend.reduce((max, point) => Math.max(max, getTrendPointTotal(point)), 0)
  if (maxCount === 0) return null

  const tied = trend.filter((point) => getTrendPointTotal(point) === maxCount)
  const firstLabel = tied[0]?.label ?? ""
  const kind: VisitsReportBusiestPeriodKind = firstLabel.includes(":") ? "hour" : firstLabel.includes("–") ? "period" : "day"
  return {
    kind,
    labels: tied.slice(0, MAX_LISTED_BUSY_PERIODS).map((point) => point.label),
    tiedCount: tied.length,
    maxCount,
  }
}

function joinTurkishList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? ""
  if (values.length === 2) return `${values[0]} ve ${values[1]}`
  return `${values.slice(0, -1).join(", ")} ve ${values.at(-1)}`
}

function buildBusiestPeriodSentence(busiest: VisitsReportBusiestPeriods | null): string {
  if (!busiest) return "Ziyaret dağılımı için yeterli zaman verisi bulunmuyor."

  const singular = busiest.kind === "hour" ? "saat" : busiest.kind === "day" ? "gün" : "dönem"
  const plural = busiest.kind === "hour" ? "saatler" : busiest.kind === "day" ? "günler" : "dönemler"
  if (busiest.tiedCount > MAX_LISTED_BUSY_PERIODS) {
    return busiest.kind === "hour"
      ? `${busiest.tiedCount} farklı saat aynı yoğunluğa ulaştı.`
      : `${busiest.tiedCount} farklı ${singular} aynı en yüksek ziyaret sayısına ulaştı.`
  }
  if (busiest.tiedCount === 1) return `En yoğun ${singular} ${busiest.labels[0]} oldu.`
  return `En yoğun ${plural} ${joinTurkishList(busiest.labels)} oldu.`
}

export function calculateVisitsReportLateArrivalRate(kpis: VisitsReportKpis): number | null {
  if (kpis.actuallyCheckedIn === 0) return null
  return Math.round((kpis.lateArrivals / kpis.actuallyCheckedIn) * 100)
}

// Deterministic sentences built only from already-calculated period data — no external
// AI/LLM call. `previous` is null when comparison is off or the period has no natural previous
// range (open-ended filters); in that case comparison clauses are simply omitted.
export function buildVisitsReportSummarySentences(current: VisitsReportPeriodSummaryInput, previous: VisitsReportPeriodSummaryInput | null): string[] {
  if (current.kpis.total === 0) {
    return ["Seçili dönemde kayıtlı ziyaret bulunmuyor."]
  }

  if (!previous) {
    const trend = current.trend ?? []
    const busiest = findVisitsReportBusiestPeriods(trend)
    const noShowCount = trend.reduce((sum, point) => sum + point.NO_SHOW, 0)
    const cancelledCount = trend.reduce((sum, point) => sum + point.CANCELLED, 0)
    const lateArrivalRate = calculateVisitsReportLateArrivalRate(current.kpis)
    const outcomeInsight = current.kpis.lateArrivals > 0 && lateArrivalRate !== null
      ? `Geç girişler gerçekleşen ziyaretlerin %${lateArrivalRate}'sini oluşturdu.`
      : noShowCount > 0
        ? `Gerçekleşmeyen ziyaretler toplam ziyaretlerin %${Math.round((noShowCount / current.kpis.total) * 100)}'sini oluşturdu.`
        : cancelledCount > 0
          ? `İptal edilen ziyaretler toplam ziyaretlerin %${Math.round((cancelledCount / current.kpis.total) * 100)}'sini oluşturdu.`
          : "Ziyaretler planlanan akış içinde ilerledi."
    return [
      buildBusiestPeriodSentence(busiest),
      outcomeInsight,
    ]
  }

  const totalChange = describeMetricChange("Toplam ziyaret sayısı", current.kpis.total, previous.kpis.total)
  const completedChange = describeMetricChange("Gerçekleşen ziyaret sayısı", current.kpis.actuallyCheckedIn, previous.kpis.actuallyCheckedIn)
  const durationChange = describeDurationChange(current.kpis.averageDurationMinutes, previous.kpis.averageDurationMinutes)
  const lateDifference = current.kpis.lateArrivals - previous.kpis.lateArrivals
  const lateChange = lateDifference === 0
    ? null
    : `${Math.abs(lateDifference)} daha ${lateDifference > 0 ? "fazla" : "az"} geç giriş kaydedildi`

  const sentences: string[] = []
  if (totalChange && completedChange) sentences.push(`${totalChange}; ${completedChange.toLocaleLowerCase("tr-TR")}.`)
  else if (totalChange || completedChange) sentences.push(`${totalChange ?? completedChange}.`)
  if (durationChange) sentences.push(`${durationChange}.`)
  if (lateChange) sentences.push(`${lateChange}.`)

  return sentences.length > 0 ? sentences.slice(0, 3) : ["Temel ziyaret göstergeleri önceki dönemle aynı kaldı."]
}

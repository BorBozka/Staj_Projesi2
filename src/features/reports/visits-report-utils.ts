import { differenceInMinutes, eachDayOfInterval, parse } from "date-fns"

import type { Visit, VisitStatus } from "@/domain/visits"
import { filterVisits, type AllVisitsFilters } from "@/features/manager/all-visits-utils"
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

export interface VisitsReportKpis {
  total: number
  completed: number
  noShowCancelledRate: number
  averageDurationMinutes: number | null
}

export function calculateVisitsReportKpis(visits: Visit[]): VisitsReportKpis {
  const total = visits.length
  const completed = visits.filter((visit) => visit.status === "CHECKED_OUT").length
  const noShowCancelled = visits.filter((visit) => visit.status === "NO_SHOW" || visit.status === "CANCELLED").length
  const noShowCancelledRate = total === 0 ? 0 : (noShowCancelled / total) * 100

  const durations = visits
    .filter((visit) => Boolean(visit.actualCheckIn && visit.actualCheckOut))
    .map((visit) => differenceInMinutes(new Date(visit.actualCheckOut!), new Date(visit.actualCheckIn!)))
  const averageDurationMinutes = durations.length === 0
    ? null
    : Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)

  return { total, completed, noShowCancelledRate, averageDurationMinutes }
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

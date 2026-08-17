import { differenceInMinutes } from "date-fns"

import type { Visit } from "@/domain/visits"
import { filterVisits, type AllVisitsFilters } from "@/features/manager/all-visits-utils"
import type { ReportsScopeFilters } from "@/features/reports/reports-filters"
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

import { differenceInMinutes, endOfDay, parse, startOfDay } from "date-fns"

import type { PlannedTransportAssignment } from "@/domain/transport-assignments"
import type { Meeting, Visit } from "@/domain/visits"
import type { ReportsScopeFilters } from "@/features/reports/reports-filters"
import { getPageCount as getPageCountShared, paginate } from "@/lib/pagination"

export const FLEET_REPORT_PAGE_SIZE = 10

function toLocalDate(value: string) {
  return parse(value, "yyyy-MM-dd", new Date())
}

export function filterAssignmentsForReport(assignments: PlannedTransportAssignment[], filters: ReportsScopeFilters): PlannedTransportAssignment[] {
  const rangeStart = filters.startDate ? startOfDay(toLocalDate(filters.startDate)) : null
  const rangeEnd = filters.endDate ? endOfDay(toLocalDate(filters.endDate)) : null

  const filtered = assignments.filter((assignment) => {
    const planned = new Date(assignment.plannedStart)
    return (filters.companyId === "all" || assignment.companyId === filters.companyId)
      && (filters.facilityId === "all" || assignment.facilityId === filters.facilityId)
      && (!rangeStart || planned >= rangeStart)
      && (!rangeEnd || planned <= rangeEnd)
  })

  return [...filtered].sort((left, right) => new Date(right.plannedStart).getTime() - new Date(left.plannedStart).getTime())
}

export interface FleetReportKpis {
  total: number
  cancelled: number
  cancelRate: number
  averagePlannedDurationMinutes: number | null
}

export function calculateFleetReportKpis(assignments: PlannedTransportAssignment[]): FleetReportKpis {
  const total = assignments.length
  const cancelled = assignments.filter((assignment) => assignment.status === "CANCELLED").length
  const cancelRate = total === 0 ? 0 : (cancelled / total) * 100

  const durations = assignments.map((assignment) => differenceInMinutes(new Date(assignment.plannedEnd), new Date(assignment.plannedStart)))
  const averagePlannedDurationMinutes = durations.length === 0
    ? null
    : Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)

  return { total, cancelled, cancelRate, averagePlannedDurationMinutes }
}

export function getRelatedRecordLabel(assignment: PlannedTransportAssignment, meetings: Meeting[], visits: Visit[]): string {
  if (assignment.relatedMeetingId) {
    const meeting = meetings.find((item) => item.id === assignment.relatedMeetingId)
    return meeting ? `Toplantı · ${meeting.hostEmployeeName}` : "—"
  }
  if (assignment.relatedVisitId) {
    const visit = visits.find((item) => item.id === assignment.relatedVisitId)
    return visit ? `Ziyaret · ${visit.visitor.firstName} ${visit.visitor.lastName}` : "—"
  }
  return "—"
}

export function paginateFleetReport(assignments: PlannedTransportAssignment[], page: number, pageSize = FLEET_REPORT_PAGE_SIZE) {
  return paginate(assignments, page, pageSize)
}

export function getFleetReportPageCount(total: number, pageSize = FLEET_REPORT_PAGE_SIZE) {
  return getPageCountShared(total, pageSize)
}

export function getVisibleFleetReportPageNumbers(page: number, pageCount: number) {
  const start = Math.max(1, Math.min(page - 1, pageCount - 2))
  return Array.from({ length: Math.min(3, pageCount) }, (_, index) => start + index)
}

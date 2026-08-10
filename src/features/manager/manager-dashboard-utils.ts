import { differenceInMinutes, isAfter, isBefore, isSameDay } from "date-fns"

import type { ExpectedAfterHoursDelivery } from "@/domain/manager-dashboard"
import type { Visit, VisitStatus } from "@/domain/visits"

export type DashboardScope = { companyId: string; facilityId: string }
export type OtherVisitsTab = "planned" | "completed"
export type TableStatusFilter = "ALL" | VisitStatus
export type OtherVisitsFilters = { tab: OtherVisitsTab; search: string; status: TableStatusFilter; facilityId: string }

export type OperationBin = {
  hour: number
  planned: number
  actual: number
  deliveries: ExpectedAfterHoursDelivery[]
}

export function getScopedVisits(visits: Visit[], scope: DashboardScope) {
  return visits.filter((visit) =>
    (scope.companyId === "all" || visit.hostCompanyId === scope.companyId) &&
    (scope.facilityId === "all" || visit.facilityId === scope.facilityId),
  )
}

export function getTodayVisits(visits: Visit[], now: Date) {
  return visits.filter((visit) => isSameDay(new Date(visit.plannedStart), now))
}

export function getOperationBins(visits: Visit[], deliveries: ExpectedAfterHoursDelivery[], startHour = 8, endHour = 23): OperationBin[] {
  return Array.from({ length: endHour - startHour + 1 }, (_, index) => {
    const hour = startHour + index
    return {
      hour,
      planned: visits.filter((visit) => new Date(visit.plannedStart).getHours() === hour).length,
      actual: visits.filter((visit) => visit.actualCheckIn && new Date(visit.actualCheckIn).getHours() === hour).length,
      deliveries: deliveries.filter((delivery) => new Date(delivery.expectedAt).getHours() === hour),
    }
  })
}

export function getStatusCounts(visits: Visit[]) {
  const baseStatuses: VisitStatus[] = ["PLANNED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"]
  const statuses = visits.some((visit) => visit.status === "NO_SHOW") ? [...baseStatuses, "NO_SHOW" as const] : baseStatuses
  return statuses.map((status) => ({ status, value: visits.filter((visit) => visit.status === status).length }))
}

export function getOverdueVisits(visits: Visit[], now: Date) {
  return visits.filter((visit) => visit.status === "CHECKED_IN" && isBefore(new Date(visit.plannedEnd), now))
}

export function getDelayMinutes(visit: Visit, now: Date) {
  return Math.max(0, differenceInMinutes(now, new Date(visit.plannedEnd)))
}

export function getNextPlannedVisits(visits: Visit[], now: Date, limit = 5) {
  return visits
    .filter((visit) => visit.status === "PLANNED" && isAfter(new Date(visit.plannedStart), now))
    .sort((left, right) => new Date(left.plannedStart).getTime() - new Date(right.plannedStart).getTime())
    .slice(0, limit)
}

export function getOtherVisits(visits: Visit[], filters: OtherVisitsFilters) {
  const query = filters.search.trim().toLocaleLowerCase("tr-TR")
  return visits.filter((visit) => {
    const tabMatches = filters.tab === "planned" ? visit.status === "PLANNED" : visit.status === "CHECKED_OUT"
    const text = (visit.visitor.firstName + " " + visit.visitor.lastName + " " + visit.hostCompanyName + " " + visit.hostEmployeeName).toLocaleLowerCase("tr-TR")
    return visit.status !== "CHECKED_IN" && tabMatches && (filters.status === "ALL" || visit.status === filters.status) && (filters.facilityId === "all" || visit.facilityId === filters.facilityId) && (!query || text.includes(query))
  })
}

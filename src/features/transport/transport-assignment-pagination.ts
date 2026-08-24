import type { PlannedTransportAssignment } from "@/domain/transport-assignments"

export const TRANSPORT_PAGE_SIZE = 5

export function paginateTransportAssignments(assignments: PlannedTransportAssignment[], page: number) {
  const start = (page - 1) * TRANSPORT_PAGE_SIZE
  return assignments.slice(start, start + TRANSPORT_PAGE_SIZE)
}

export function getTransportPageCount(total: number) {
  return Math.max(1, Math.ceil(total / TRANSPORT_PAGE_SIZE))
}

export function getVisibleTransportPageNumbers(page: number, pageCount: number) {
  const start = Math.max(1, Math.min(page - 1, pageCount - 2))
  return Array.from({ length: Math.min(3, pageCount) }, (_, index) => start + index)
}

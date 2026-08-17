import { addDays, differenceInCalendarDays, format } from "date-fns"

import type { PlannedTransportAssignment, TransportAvailabilityInput } from "@/domain/transport-assignments"
import { formatTr } from "@/lib/date"

export function buildTransportAvailabilityInput(
  companyId: string,
  facilityId: string,
  date: string,
  startTime: string,
  endTime: string,
): TransportAvailabilityInput | null {
  if (!companyId || !facilityId || !date || Boolean(startTime) !== Boolean(endTime)) return null

  const plannedStart = new Date(`${date}T${startTime || "00:00"}:00`)
  const plannedEnd = startTime ? new Date(`${date}T${endTime}:00`) : addDays(plannedStart, 1)
  if (Number.isNaN(plannedStart.getTime()) || Number.isNaN(plannedEnd.getTime())) return null

  return { companyId, facilityId, plannedStart: plannedStart.toISOString(), plannedEnd: plannedEnd.toISOString() }
}

export function isUntimedDailyTransportAssignment(assignment: Pick<PlannedTransportAssignment, "plannedStart" | "plannedEnd">) {
  const start = new Date(assignment.plannedStart)
  const end = new Date(assignment.plannedEnd)
  return start.getHours() === 0
    && start.getMinutes() === 0
    && end.getHours() === 0
    && end.getMinutes() === 0
    && differenceInCalendarDays(end, start) === 1
}

export function getTransportAssignmentFormTimes(assignment: PlannedTransportAssignment) {
  if (isUntimedDailyTransportAssignment(assignment)) return { startTime: "", endTime: "" }
  return {
    startTime: format(new Date(assignment.plannedStart), "HH:mm"),
    endTime: format(new Date(assignment.plannedEnd), "HH:mm"),
  }
}

export function formatTransportAssignmentSchedule(assignment: PlannedTransportAssignment, includeYear = false) {
  const start = new Date(assignment.plannedStart)
  if (isUntimedDailyTransportAssignment(assignment)) {
    return `${formatTr(start, includeYear ? "d MMMM yyyy" : "d MMM")} · Saat belirtilmedi`
  }
  return `${formatTr(start, includeYear ? "d MMMM yyyy · HH:mm" : "d MMM HH:mm")} – ${formatTr(new Date(assignment.plannedEnd), "HH:mm")}`
}

import type { Meeting, VisitRecord } from "@/domain/visits"

// ---------------------------------------------------------------------------
// Meeting lifecycle helpers
// These are pure functions over domain objects — no service calls.
// ---------------------------------------------------------------------------

/**
 * True when the meeting has been explicitly closed (actualMeetingEnd is set).
 * This is independent of whether all visits are in terminal states.
 */
export function isMeetingExplicitlyClosed(meeting: Meeting): boolean {
  return !!meeting.actualMeetingEnd
}

/**
 * True when the meeting's planned end has passed and the meeting has not yet
 * been closed. Used only for displaying the "overtime" label in the UI.
 */
export function isMeetingOvertime(meeting: Meeting, now: Date = new Date()): boolean {
  return !meeting.actualMeetingEnd && now > new Date(meeting.plannedEnd)
}

export function canEmployeeManageMeetingLifecycle(
  meeting: Pick<Meeting, "hostEmployeeId">,
  employeeId?: string,
): boolean {
  return Boolean(employeeId) && meeting.hostEmployeeId === employeeId
}

const terminalVisitStatuses = new Set<VisitRecord["status"]>(["CHECKED_OUT", "CANCELLED", "NO_SHOW"])

export function hasLinkedNonTerminalVisit(
  meetingId: string,
  visits: Pick<VisitRecord, "meetingId" | "status">[],
): boolean {
  return visits.some((visit) => visit.meetingId === meetingId && !terminalVisitStatuses.has(visit.status))
}

export function areAllLinkedVisitsTerminal(
  meetingId: string,
  visits: Pick<VisitRecord, "meetingId" | "status">[],
): boolean {
  const linkedVisits = visits.filter((visit) => visit.meetingId === meetingId)
  return linkedVisits.length > 0 && !hasLinkedNonTerminalVisit(meetingId, linkedVisits)
}

export function isMeetingResourceReadOnly(
  meeting: Meeting,
  visits: Pick<VisitRecord, "meetingId" | "status">[],
): boolean {
  return isMeetingExplicitlyClosed(meeting) || areAllLinkedVisitsTerminal(meeting.id, visits)
}

export type ManualMeetingLifecycleBlockReason = "NOT_HOST" | "NOT_STARTED" | "CLOSED" | "NO_LINKED_VISITS" | "TERMINAL"

export function getManualMeetingLifecycleBlockReason(
  meeting: Meeting,
  visits: Pick<VisitRecord, "meetingId" | "status">[],
  employeeId: string | undefined,
  now: Date = new Date(),
): ManualMeetingLifecycleBlockReason | null {
  if (!canEmployeeManageMeetingLifecycle(meeting, employeeId)) return "NOT_HOST"
  if (isMeetingExplicitlyClosed(meeting)) return "CLOSED"
  if (now.getTime() < new Date(meeting.plannedStart).getTime()) return "NOT_STARTED"
  if (!visits.some((visit) => visit.meetingId === meeting.id)) return "NO_LINKED_VISITS"
  if (!hasLinkedNonTerminalVisit(meeting.id, visits)) return "TERMINAL"
  return null
}

export function getOverdueOpenHostedMeetings(
  meetings: Meeting[],
  visits: Pick<VisitRecord, "meetingId" | "status">[],
  employeeId: string | undefined,
  now: Date = new Date(),
): Meeting[] {
  if (!employeeId) return []
  const nowMs = now.getTime()
  return meetings
    .filter((meeting) =>
      getManualMeetingLifecycleBlockReason(meeting, visits, employeeId, now) === null
      && new Date(meeting.plannedEnd).getTime() <= nowMs)
    .sort((a, b) => new Date(a.plannedEnd).getTime() - new Date(b.plannedEnd).getTime())
}

/**
 * Signed variance in whole minutes: actualMeetingEnd − plannedEnd.
 * Returns null when the meeting has not been closed yet.
 * Positive  → meeting ran over.
 * Negative  → meeting ended early.
 * Zero      → meeting ended exactly on time.
 */
export function computeMeetingEndVarianceMinutes(meeting: Meeting): number | null {
  if (!meeting.actualMeetingEnd) return null
  return Math.round(
    (new Date(meeting.actualMeetingEnd).getTime() - new Date(meeting.plannedEnd).getTime()) / 60_000,
  )
}

/**
 * Computes the new plannedEnd when the manager requests an extension.
 * Formula: max(current plannedEnd, currentTime) + extensionMinutes
 */
export function computeExtendedPlannedEnd(
  currentPlannedEnd: string,
  currentTime: Date,
  extensionMinutes: number,
): Date {
  const base = Math.max(new Date(currentPlannedEnd).getTime(), currentTime.getTime())
  return new Date(base + extensionMinutes * 60_000)
}

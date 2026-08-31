import type { CloseMeetingInput, ExtendMeetingInput, Meeting, MeetingInput, MeetingWithVisits, RescheduleVisitInput, Visit, VisitReferenceData } from "@/domain/visits"

export interface CheckoutVisitInput {
  /** Recorded with the checkout as the operational card-return decision. */
  visitorCardReturned?: boolean
}

export interface VisitService {
  listMeetings(): Promise<Meeting[]>
  listVisits(): Promise<Visit[]>
  getReferenceData(): Promise<VisitReferenceData>
  createMeeting(input: MeetingInput): Promise<MeetingWithVisits>
  updateMeeting(id: string, input: MeetingInput): Promise<MeetingWithVisits>
  sendMeetingInvitations(id: string): Promise<Visit[]>
  sendVisitInvitation(id: string): Promise<Visit>
  rescheduleVisit(id: string, input: RescheduleVisitInput): Promise<Visit>
  cancelVisit(id: string): Promise<Visit>
  cancelMeeting(id: string): Promise<Visit[]>

  // ---- Meeting lifecycle ------------------------------------------------

  /**
   * Extends the meeting's plannedEnd using the formula:
   *   newPlannedEnd = max(current plannedEnd, input.currentTime) + extensionMinutes
   *
   * Before updating, the existing ROOM and POOLED_EQUIPMENT assignments are
   * re-validated against the new time range.  If any conflict or capacity
   * violation exists the operation is rejected entirely and an error is thrown.
   *
   * Throws if the actor is not the Meeting host, the Meeting has not started,
   * the Meeting is already closed, or all linked Visits are terminal.
   */
  extendMeeting(meetingId: string, input: ExtendMeetingInput): Promise<Meeting>

  /**
   * Explicitly closes a meeting, recording actualMeetingEnd = now and the
   * provided source.
   *
   * MANUAL close validates that actorEmployeeId is the Meeting host, the
   * Meeting has started, it is open, and at least one linked Visit is
   * non-terminal.
   * VISITOR_CHECK_OUT remains an automatic system transition.
   * Throws if the meeting is already closed.
   */
  closeMeeting(meetingId: string, input: CloseMeetingInput): Promise<Meeting>

  /**
   * Checks out a single visitor (CHECKED_IN → CHECKED_OUT).
   *
   * If this is the last checked-in visitor in the meeting and the meeting has
   * not already been closed, the meeting is automatically closed with source
   * VISITOR_CHECK_OUT and the closed Meeting is returned alongside the visit.
   *
   * If the meeting was already manually closed, or if other visitors are still
   * checked in, closedMeeting is null.
   */
  checkoutVisit(visitId: string, input?: CheckoutVisitInput): Promise<{ visit: Visit; closedMeeting: Meeting | null }>
}

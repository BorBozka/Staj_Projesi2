import type { Meeting, MeetingInput, MeetingWithVisits, RescheduleVisitInput, Visit, VisitReferenceData } from "@/domain/visits"

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
}

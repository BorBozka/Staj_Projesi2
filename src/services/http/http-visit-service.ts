import { apiClient } from "@/lib/http"
import type {
  CloseMeetingInput,
  ExtendMeetingInput,
  Meeting,
  MeetingInput,
  MeetingWithVisits,
  RescheduleVisitInput,
  Visit,
  VisitReferenceData,
} from "@/domain/visits"
import type { CheckoutVisitInput, VisitService } from "@/services/visit-service"
import {
  mapMeeting,
  mapMeetingWithVisits,
  mapReferenceData,
  mapVisit,
  type MeetingDto,
  type MeetingWithVisitsDto,
  type ReferenceDataDto,
  type VisitDto,
} from "@/services/http/mappers"

/**
 * Visit / Meeting adapter over the Phase 3/4 endpoints. Creator and actor identity are always
 * resolved from the session server-side, so no `*EmployeeId` / `currentTime` is ever sent. The
 * server returns the canonical Meeting/Visit shape; mappers flatten it to the frontend model.
 */
export class HttpVisitService implements VisitService {
  async listMeetings(): Promise<Meeting[]> {
    return (await apiClient.get<MeetingDto[]>("/meetings")).map(mapMeeting)
  }

  async listVisits(): Promise<Visit[]> {
    return (await apiClient.get<VisitDto[]>("/visits")).map(mapVisit)
  }

  async getReferenceData(): Promise<VisitReferenceData> {
    return mapReferenceData(await apiClient.get<ReferenceDataDto>("/visits/reference-data"))
  }

  async createMeeting(input: MeetingInput): Promise<MeetingWithVisits> {
    return mapMeetingWithVisits(await apiClient.post<MeetingWithVisitsDto>("/meetings", input))
  }

  async updateMeeting(id: string, input: MeetingInput): Promise<MeetingWithVisits> {
    return mapMeetingWithVisits(await apiClient.patch<MeetingWithVisitsDto>(`/meetings/${encodeURIComponent(id)}`, input))
  }

  async sendMeetingInvitations(id: string): Promise<Visit[]> {
    return (await apiClient.post<VisitDto[]>(`/meetings/${encodeURIComponent(id)}/invitations`)).map(mapVisit)
  }

  async sendVisitInvitation(id: string): Promise<Visit> {
    return mapVisit(await apiClient.post<VisitDto>(`/visits/${encodeURIComponent(id)}/invitation`))
  }

  async rescheduleVisit(id: string, input: RescheduleVisitInput): Promise<Visit> {
    return mapVisit(
      await apiClient.patch<VisitDto>(`/visits/${encodeURIComponent(id)}/reschedule`, {
        plannedStart: input.plannedStart,
        plannedEnd: input.plannedEnd,
      }),
    )
  }

  async cancelVisit(id: string): Promise<Visit> {
    return mapVisit(await apiClient.post<VisitDto>(`/visits/${encodeURIComponent(id)}/cancel`))
  }

  async cancelMeeting(id: string): Promise<Visit[]> {
    const dto = await apiClient.post<MeetingWithVisitsDto>(`/meetings/${encodeURIComponent(id)}/cancel`)
    return dto.visits.map(mapVisit)
  }

  async extendMeeting(meetingId: string, input: ExtendMeetingInput): Promise<Meeting> {
    // Only the minute count crosses the wire — the server derives the host actor and computes
    // the new end (and re-validates resources) itself.
    const dto = await apiClient.post<MeetingWithVisitsDto>(`/meetings/${encodeURIComponent(meetingId)}/extend`, {
      extensionMinutes: input.extensionMinutes,
    })
    return mapMeeting(dto.meeting)
  }

  async closeMeeting(meetingId: string, _input: CloseMeetingInput): Promise<Meeting> {
    void _input
    const dto = await apiClient.post<MeetingWithVisitsDto>(`/meetings/${encodeURIComponent(meetingId)}/close`)
    return mapMeeting(dto.meeting)
  }

  async checkoutVisit(_visitId: string, _input?: CheckoutVisitInput): Promise<{ visit: Visit; closedMeeting: Meeting | null }> {
    void _visitId
    void _input
    // Not part of the HTTP surface: visitor checkout runs through the Security desk
    // (`POST /api/security/visits/:id/check-out`), which auto-closes the meeting server-side.
    throw new Error("checkoutVisit HTTP adapter üzerinden desteklenmiyor; güvenlik çıkışını kullanın.")
  }
}

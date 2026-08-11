import type {
  Meeting,
  MeetingInput,
  MeetingWithVisits,
  RescheduleVisitInput,
  Visit,
  VisitorInput,
  VisitRecord,
  VisitReferenceData,
} from "@/domain/visits"
import { initialMockMeetings, initialMockVisitRecords, mockVisitReferenceData } from "@/services/mock-visit-data"
import type { VisitService } from "@/services/visit-service"

const clone = <T,>(value: T): T => structuredClone(value)

export class MockVisitService implements VisitService {
  private meetings = clone(initialMockMeetings)
  private visits = clone(initialMockVisitRecords)

  constructor(private readonly shouldFailInvitation: (visit: Visit) => boolean = () => false) {}

  async listMeetings(): Promise<Meeting[]> {
    return clone(this.meetings).sort((a, b) => a.plannedStart.localeCompare(b.plannedStart))
  }

  async listVisits(): Promise<Visit[]> {
    return clone(this.visits.map((visit) => this.projectVisit(visit)))
      .sort((a, b) => a.plannedStart.localeCompare(b.plannedStart))
  }

  async getReferenceData(): Promise<VisitReferenceData> {
    return clone(mockVisitReferenceData)
  }

  async createMeeting(input: MeetingInput): Promise<MeetingWithVisits> {
    this.validateVisitors(input.visitors)
    const meeting = this.fromMeetingInput(`meeting-${crypto.randomUUID()}`, input)
    const visits = input.visitors.map((visitor) => this.fromVisitorInput(meeting.id, visitor))
    this.meetings = [...this.meetings, meeting]
    this.visits = [...this.visits, ...visits]
    return this.projectMeeting(meeting.id)
  }

  async updateMeeting(id: string, input: MeetingInput): Promise<MeetingWithVisits> {
    this.validateVisitors(input.visitors)
    const currentMeeting = this.findMeeting(id)
    const now = new Date().toISOString()
    const updatedMeeting = this.fromMeetingInput(id, input, currentMeeting)
    const submittedVisitIds = new Set(input.visitors.flatMap((visitor) => visitor.visitId ? [visitor.visitId] : []))

    for (const visitId of submittedVisitIds) {
      const visit = this.findVisitRecord(visitId)
      if (visit.meetingId !== id) throw new Error("Ziyaret bu ziyaret grubuna ait değil.")
    }

    this.meetings = this.meetings.map((meeting) => meeting.id === id ? updatedMeeting : meeting)
    this.visits = this.visits.map((visit) => {
      if (visit.meetingId !== id) return visit
      const visitorInput = input.visitors.find((visitor) => visitor.visitId === visit.id)
      const visitor = visitorInput ? this.toVisitor(visitorInput, visit.visitor.id) : visit.visitor
      return visit.status === "PLANNED"
        ? {
            ...visit,
            visitor,
            invitationStatus: "NOT_SENT",
            invitationSentAt: undefined,
            invitationError: undefined,
            updatedAt: now,
          }
        : { ...visit, visitor, updatedAt: now }
    })

    const newVisits = input.visitors
      .filter((visitor) => !visitor.visitId)
      .map((visitor) => this.fromVisitorInput(id, visitor))
    this.visits = [...this.visits, ...newVisits]
    return this.projectMeeting(id)
  }

  async sendMeetingInvitations(id: string): Promise<Visit[]> {
    this.findMeeting(id)
    const pendingVisitIds = this.visits
      .filter((visit) => visit.meetingId === id
        && visit.status === "PLANNED"
        && (visit.invitationStatus === "NOT_SENT" || visit.invitationStatus === "FAILED"))
      .map((visit) => visit.id)

    const results = await Promise.all(pendingVisitIds.map((visitId) => this.deliverInvitation(visitId)))
    return clone(results)
  }

  async sendVisitInvitation(id: string): Promise<Visit> {
    const current = this.findVisitRecord(id)
    if (current.status !== "PLANNED") throw new Error("Yalnızca planlanmış ziyaretler için davet gönderilebilir.")
    if (current.invitationStatus === "SENT" || current.invitationStatus === "SENDING") {
      return clone(this.projectVisit(current))
    }
    return clone(await this.deliverInvitation(id))
  }

  async rescheduleVisit(id: string, input: RescheduleVisitInput): Promise<Visit> {
    const current = this.findVisitRecord(id)
    const meeting = this.findMeeting(current.meetingId)
    const now = new Date().toISOString()
    const updatedMeeting: Meeting = {
      ...meeting,
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
      updatedAt: now,
    }
    this.meetings = this.meetings.map((item) => item.id === meeting.id ? updatedMeeting : item)
    this.visits = this.visits.map((visit) => visit.meetingId === meeting.id && visit.status === "PLANNED"
      ? {
          ...visit,
          invitationStatus: "NOT_SENT",
          invitationSentAt: undefined,
          invitationError: undefined,
          updatedAt: now,
        }
      : visit)
    return clone(this.projectVisit(this.findVisitRecord(id)))
  }

  async cancelVisit(id: string): Promise<Visit> {
    const current = this.findVisitRecord(id)
    if (current.status !== "PLANNED") {
      throw new Error("Yalnızca planlanmış ziyaretler iptal edilebilir.")
    }
    const now = new Date().toISOString()
    const updated: VisitRecord = { ...current, status: "CANCELLED", cancelledAt: now, updatedAt: now }
    this.visits = this.visits.map((visit) => visit.id === id ? updated : visit)
    return clone(this.projectVisit(updated))
  }

  async cancelMeeting(id: string): Promise<Visit[]> {
    this.findMeeting(id)
    const now = new Date().toISOString()
    this.visits = this.visits.map((visit) => visit.meetingId === id && visit.status === "PLANNED"
      ? { ...visit, status: "CANCELLED", cancelledAt: now, updatedAt: now }
      : visit)
    return clone(this.visits.filter((visit) => visit.meetingId === id).map((visit) => this.projectVisit(visit)))
  }

  private async deliverInvitation(id: string): Promise<Visit> {
    const current = this.findVisitRecord(id)
    const sending: VisitRecord = {
      ...current,
      invitationStatus: "SENDING",
      invitationError: undefined,
      updatedAt: new Date().toISOString(),
    }
    this.visits = this.visits.map((visit) => visit.id === id ? sending : visit)
    await Promise.resolve()

    const failed = this.shouldFailInvitation(this.projectVisit(sending))
    const completedAt = new Date().toISOString()
    const completed: VisitRecord = failed
      ? { ...sending, invitationStatus: "FAILED", invitationError: "Davet teknik bir hata nedeniyle gönderilemedi.", updatedAt: completedAt }
      : { ...sending, invitationStatus: "SENT", invitationSentAt: completedAt, invitationError: undefined, updatedAt: completedAt }
    this.visits = this.visits.map((visit) => visit.id === id ? completed : visit)
    return this.projectVisit(completed)
  }

  private findMeeting(id: string) {
    const meeting = this.meetings.find((item) => item.id === id)
    if (!meeting) throw new Error("Ziyaret grubu bulunamadı.")
    return meeting
  }

  private findVisitRecord(id: string) {
    const visit = this.visits.find((item) => item.id === id)
    if (!visit) throw new Error("Ziyaret bulunamadı.")
    return visit
  }

  private projectVisit(visit: VisitRecord): Visit {
    const meeting = this.findMeeting(visit.meetingId)
    return {
      ...visit,
      creatorEmployeeId: meeting.creatorEmployeeId,
      visitTypeId: meeting.visitTypeId,
      visitTypeName: meeting.visitTypeName,
      hostEmployeeId: meeting.hostEmployeeId,
      hostEmployeeName: meeting.hostEmployeeName,
      hostCompanyId: meeting.hostCompanyId,
      hostCompanyName: meeting.hostCompanyName,
      facilityId: meeting.facilityId,
      facilityName: meeting.facilityName,
      plannedStart: meeting.plannedStart,
      plannedEnd: meeting.plannedEnd,
      note: meeting.note,
      hasAdditionalRequirements: meeting.hasAdditionalRequirements,
      additionalRequirementNote: meeting.additionalRequirementNote,
    }
  }

  private projectMeeting(id: string): MeetingWithVisits {
    const meeting = this.findMeeting(id)
    return clone({
      meeting,
      visits: this.visits.filter((visit) => visit.meetingId === id).map((visit) => this.projectVisit(visit)),
    })
  }

  private fromMeetingInput(id: string, input: MeetingInput, existing?: Meeting): Meeting {
    const reference = mockVisitReferenceData
    const visitType = reference.visitTypes.find((item) => item.id === input.visitTypeId)
    const company = reference.companies.find((item) => item.id === input.hostCompanyId)
    const facility = reference.facilities.find((item) => item.id === input.facilityId && item.companyId === input.hostCompanyId)
    if (!visitType || !company || !facility) throw new Error("Geçersiz ziyaret referans bilgisi.")

    const hostName = input.hostEmployeeName.trim()
    const hostEmployee = reference.employees.find((employee) => employee.name === hostName)
    const now = new Date().toISOString()
    return {
      id,
      creatorEmployeeId: existing?.creatorEmployeeId ?? reference.currentEmployee.employeeId,
      visitTypeId: visitType.id,
      visitTypeName: visitType.name,
      hostEmployeeId: hostEmployee?.id ?? (existing?.hostEmployeeName === hostName ? existing.hostEmployeeId : `manual-host-${crypto.randomUUID()}`),
      hostEmployeeName: hostName,
      hostCompanyId: company.id,
      hostCompanyName: company.name,
      facilityId: facility.id,
      facilityName: facility.name,
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
      note: input.note?.trim() || undefined,
      hasAdditionalRequirements: input.hasAdditionalRequirements ?? false,
      additionalRequirementNote: input.hasAdditionalRequirements ? input.additionalRequirementNote?.trim() || undefined : undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
  }

  private fromVisitorInput(meetingId: string, input: VisitorInput): VisitRecord {
    const now = new Date().toISOString()
    return {
      id: `v-${crypto.randomUUID()}`,
      meetingId,
      visitor: this.toVisitor(input, `visitor-${crypto.randomUUID()}`),
      status: "PLANNED",
      invitationStatus: "NOT_SENT",
      createdAt: now,
      updatedAt: now,
    }
  }

  private toVisitor(input: VisitorInput, id: string) {
    return {
      id,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim(),
      phone: input.phone?.trim() || undefined,
    }
  }

  private validateVisitors(visitors: VisitorInput[]) {
    if (visitors.length === 0) throw new Error("En az bir ziyaretçi zorunludur.")
    const visitIds = visitors.flatMap((visitor) => visitor.visitId ? [visitor.visitId] : [])
    if (new Set(visitIds).size !== visitIds.length) throw new Error("Aynı ziyaretçi kaydı birden fazla kez gönderilemez.")
  }
}

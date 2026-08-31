import type {
  CloseMeetingInput,
  ExtendMeetingInput,
  Meeting,
  MeetingInput,
  MeetingWithVisits,
  RescheduleVisitInput,
  Visit,
  VisitorInput,
  VisitRecord,
  VisitReferenceData,
} from "@/domain/visits"
import { hasVisitorEmail } from "@/domain/visits"
import { computeExtendedPlannedEnd, getManualMeetingLifecycleBlockReason, isMeetingExplicitlyClosed } from "@/lib/meeting-lifecycle"
import { createMockVisitReferenceData, initialMockMeetings, initialMockVisitRecords } from "@/services/mock-visit-data"
import { MockOrganizationStore } from "@/services/mock-organization-store"
import { MockVisitTypeStore } from "@/services/mock-visit-type-store"
import type { CheckoutVisitInput, VisitService } from "@/services/visit-service"


const clone = <T,>(value: T): T => structuredClone(value)

export class MockVisitService implements VisitService {
  private meetings = clone(initialMockMeetings)
  private visits = clone(initialMockVisitRecords)

  constructor(
    private readonly shouldFailInvitation: (visit: Visit) => boolean = () => false,
    private readonly organizationStore = new MockOrganizationStore(),
    private readonly visitTypeStore = new MockVisitTypeStore(),
  ) {}

  async listMeetings(): Promise<Meeting[]> {
    return clone(this.meetings).sort((a, b) => a.plannedStart.localeCompare(b.plannedStart))
  }

  async listVisits(): Promise<Visit[]> {
    return clone(this.visits.map((visit) => this.projectVisit(visit)))
      .sort((a, b) => a.plannedStart.localeCompare(b.plannedStart))
  }

  async getReferenceData(): Promise<VisitReferenceData> {
    return clone(this.getReferenceDataSnapshot())
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
    this.assertMeetingEditable(currentMeeting)
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
        && hasVisitorEmail(visit.visitor)
        && (visit.invitationStatus === "NOT_SENT" || visit.invitationStatus === "FAILED"))
      .map((visit) => visit.id)

    const results = await Promise.all(pendingVisitIds.map((visitId) => this.deliverInvitation(visitId)))
    return clone(results)
  }

  async sendVisitInvitation(id: string): Promise<Visit> {
    const current = this.findVisitRecord(id)
    if (current.status !== "PLANNED") throw new Error("Yalnızca planlanmış ziyaretler için davet gönderilebilir.")
    if (!hasVisitorEmail(current.visitor)) throw new Error("Ziyaretçinin davet gönderilebilecek e-posta adresi bulunmuyor.")
    if (current.invitationStatus === "SENT" || current.invitationStatus === "SENDING") {
      return clone(this.projectVisit(current))
    }
    return clone(await this.deliverInvitation(id))
  }

  async rescheduleVisit(id: string, input: RescheduleVisitInput): Promise<Visit> {
    const current = this.findVisitRecord(id)
    const meeting = this.findMeeting(current.meetingId)
    this.assertMeetingEditable(meeting)
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

  // ---- Meeting lifecycle --------------------------------------------------

  /**
   * Allows the ResourceAssignmentService to be injected after construction to
   * break the circular dependency:
   * MockVisitService ← MockResourceAssignmentService ← MockVisitService
   */
  private resourceAssignmentService?: {
    validateExtension(meetingId: string, newPlannedEnd: string): Promise<void>
  }

  setResourceAssignmentService(svc: { validateExtension(meetingId: string, newPlannedEnd: string): Promise<void> }) {
    this.resourceAssignmentService = svc
  }

  async extendMeeting(meetingId: string, input: ExtendMeetingInput): Promise<Meeting> {
    if (!Number.isInteger(input.extensionMinutes) || input.extensionMinutes <= 0) {
      throw new Error("Uzatma süresi pozitif bir tam sayı dakika olmalıdır.")
    }
    const meeting = this.findMeeting(meetingId)
    const currentTime = new Date(input.currentTime)
    this.assertManualLifecycleEligible(meeting, input.actorEmployeeId, new Date(), "EXTEND")

    const newEnd = computeExtendedPlannedEnd(
      meeting.plannedEnd,
      currentTime,
      input.extensionMinutes,
    )
    const newPlannedEnd = newEnd.toISOString()

    // Re-validate existing resource assignments for the new time range.
    if (this.resourceAssignmentService) {
      await this.resourceAssignmentService.validateExtension(meetingId, newPlannedEnd)
    }

    const now = new Date().toISOString()
    const updated: Meeting = { ...meeting, plannedEnd: newPlannedEnd, updatedAt: now }
    this.meetings = this.meetings.map((m) => (m.id === meetingId ? updated : m))
    return clone(updated)
  }

  async closeMeeting(meetingId: string, input: CloseMeetingInput): Promise<Meeting> {
    const meeting = this.findMeeting(meetingId)
    const now = new Date()
    if (input.source === "MANUAL") {
      this.assertManualLifecycleEligible(meeting, input.actorEmployeeId, now, "CLOSE")
    }
    if (meeting.actualMeetingEnd) {
      throw new Error("Toplantı zaten kapatılmış.")
    }
    const closedAt = now.toISOString()
    const updated: Meeting = {
      ...meeting,
      actualMeetingEnd: closedAt,
      meetingEndSource: input.source,
      updatedAt: closedAt,
    }
    this.meetings = this.meetings.map((m) => (m.id === meetingId ? updated : m))
    return clone(updated)
  }

  async checkoutVisit(visitId: string, input?: CheckoutVisitInput): Promise<{ visit: Visit; closedMeeting: Meeting | null }> {
    const current = this.findVisitRecord(visitId)
    if (current.status !== "CHECKED_IN") {
      throw new Error("Yalnızca içerideki ziyaretçiler çıkış yapabilir.")
    }
    const now = new Date().toISOString()
    const checkedOut: VisitRecord = {
      ...current,
      status: "CHECKED_OUT",
      actualCheckOut: now,
      visitorCardReturned: input?.visitorCardReturned ?? current.visitorCardReturned,
      updatedAt: now,
    }
    this.visits = this.visits.map((v) => (v.id === visitId ? checkedOut : v))

    const meetingId = current.meetingId
    const meeting = this.findMeeting(meetingId)

    // Auto-close only if the meeting has not already been explicitly closed.
    let closedMeeting: Meeting | null = null
    if (!meeting.actualMeetingEnd) {
      const stillCheckedIn = this.visits.filter(
        (v) => v.meetingId === meetingId && v.status === "CHECKED_IN",
      )
      if (stillCheckedIn.length === 0) {
        closedMeeting = await this.closeMeeting(meetingId, { source: "VISITOR_CHECK_OUT" })
      }
    }

    return { visit: clone(this.projectVisit(checkedOut)), closedMeeting }
  }

  // ---- Security-only internal bridge --------------------------------------
  // Not part of the public VisitService contract: Security's own mutations are kept off
  // VisitService's/AdminService's public API (see MockSecurityService) rather than spread
  // across them. This is the minimal composition-root-only bridge that lets MockSecurityService
  // read and mutate the VisitRecord state this service already owns, mirroring the existing
  // setResourceAssignmentService wiring used to break another cross-service dependency. Callers
  // are expected to validate status/eligibility themselves before invoking these.

  getVisitRecordForSecurity(id: string): VisitRecord {
    return clone(this.findVisitRecord(id))
  }

  applyCheckIn(visitId: string, checkIn: { visitorCardId: string; visitorCardNumber: string; vehiclePlate?: string; phone?: string }): Visit {
    const current = this.findVisitRecord(visitId)
    const now = new Date().toISOString()
    const updated: VisitRecord = {
      ...current,
      status: "CHECKED_IN",
      actualCheckIn: now,
      visitorCardId: checkIn.visitorCardId,
      visitorCardNumber: checkIn.visitorCardNumber,
      vehiclePlate: checkIn.vehiclePlate,
      // Only overwrite the visitor's phone when the gate actually captured one.
      visitor: checkIn.phone ? { ...current.visitor, phone: checkIn.phone } : current.visitor,
      updatedAt: now,
    }
    this.visits = this.visits.map((visit) => visit.id === visitId ? updated : visit)
    return clone(this.projectVisit(updated))
  }

  applyVisitorCorrection(
    visitId: string,
    correction: { firstName: string; lastName: string; company: string; email?: string; phone?: string; hostEmployeeName?: string; visitTypeId?: string },
  ): Visit {
    const current = this.findVisitRecord(visitId)
    const meeting = this.findMeeting(current.meetingId)
    const now = new Date().toISOString()
    const { hostEmployeeName, visitTypeId, ...visitorCorrection } = correction

    const nextHostName = hostEmployeeName?.trim()
    const hostChanged = Boolean(nextHostName) && nextHostName !== meeting.hostEmployeeName
    const nextVisitType = visitTypeId ? this.getReferenceDataSnapshot().visitTypes.find((type) => type.id === visitTypeId) : undefined
    if (visitTypeId && !nextVisitType) throw new Error("Ziyaret türü bulunamadı.")
    if (nextVisitType && !nextVisitType.active && nextVisitType.id !== meeting.visitTypeId) throw new Error("Pasif ziyaret türü seçilemez.")
    const visitTypeChanged = Boolean(nextVisitType) && nextVisitType!.id !== meeting.visitTypeId

    let hostAudit: Pick<VisitRecord, "hostCorrectedFrom" | "hostCorrectedAt" | "hostCorrectedBy"> = {}
    if (hostChanged) {
      const reference = this.getReferenceDataSnapshot()
      const actorName = reference.employees.find((employee) => employee.id === reference.currentEmployee.employeeId)?.name
        ?? reference.currentEmployee.employeeId
      hostAudit = { hostCorrectedFrom: meeting.hostEmployeeName, hostCorrectedAt: now, hostCorrectedBy: actorName }
    }
    if (hostChanged || visitTypeChanged) {
      this.meetings = this.meetings.map((item) => item.id === meeting.id
        ? {
            ...item,
            ...(hostChanged ? { hostEmployeeName: nextHostName! } : {}),
            ...(visitTypeChanged ? { visitTypeId: nextVisitType!.id, visitTypeName: nextVisitType!.name } : {}),
            updatedAt: now,
          }
        : item)
    }

    const updated: VisitRecord = {
      ...current,
      visitor: { ...current.visitor, ...visitorCorrection },
      ...hostAudit,
      updatedAt: now,
    }
    this.visits = this.visits.map((visit) => visit.id === visitId ? updated : visit)
    return clone(this.projectVisit(updated))
  }

  applyLateVisitorCardReturn(visitId: string): Visit {
    const current = this.findVisitRecord(visitId)
    if (current.status !== "CHECKED_OUT") {
      throw new Error("Kart iadesi yalnızca çıkışı tamamlanmış ziyaret için kaydedilebilir.")
    }
    const updated: VisitRecord = {
      ...current,
      visitorCardReturned: true,
      updatedAt: new Date().toISOString(),
    }
    this.visits = this.visits.map((visit) => visit.id === visitId ? updated : visit)
    return clone(this.projectVisit(updated))
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

  private assertManualLifecycleEligible(
    meeting: Meeting,
    actorEmployeeId: string,
    currentTime: Date,
    action: "EXTEND" | "CLOSE",
  ) {
    const reason = getManualMeetingLifecycleBlockReason(meeting, this.visits, actorEmployeeId, currentTime)
    switch (reason) {
      case null:
        return
      case "NOT_HOST":
        throw new Error("Bu toplantının yaşam döngüsü aksiyonlarını yalnızca ev sahibi kullanabilir.")
      case "NOT_STARTED":
        throw new Error("Toplantı başlamadan manuel yaşam döngüsü aksiyonu uygulanamaz.")
      case "CLOSED":
        throw new Error(action === "EXTEND" ? "Kapatılmış bir toplantı uzatılamaz." : "Toplantı zaten kapatılmış.")
      case "NO_LINKED_VISITS":
        throw new Error("Ziyaretçisi bulunmayan bir toplantıda manuel yaşam döngüsü aksiyonu uygulanamaz.")
      case "TERMINAL":
        throw new Error("Tüm ziyaretleri tamamlanmış bir toplantıda manuel yaşam döngüsü aksiyonu uygulanamaz.")
    }
  }

  private assertMeetingEditable(meeting: Meeting) {
    if (isMeetingExplicitlyClosed(meeting)) {
      throw new Error("Kapatılmış bir toplantının ortak bilgileri değiştirilemez.")
    }
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
      actualMeetingEnd: meeting.actualMeetingEnd,
      meetingEndSource: meeting.meetingEndSource,
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
    const reference = this.getReferenceDataSnapshot()
    const visitType = reference.visitTypes.find((item) => item.id === input.visitTypeId)
    const company = reference.companies.find((item) => item.id === input.hostCompanyId)
    const facility = reference.facilities.find((item) => item.id === input.facilityId && item.companyId === input.hostCompanyId)
    if (!visitType || !company || !facility) throw new Error("Geçersiz ziyaret referans bilgisi.")
    if (!visitType.active && visitType.id !== existing?.visitTypeId) throw new Error("Pasif ziyaret türü seçilemez.")

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
      actualMeetingEnd: existing?.actualMeetingEnd,
      meetingEndSource: existing?.meetingEndSource,
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
      email: input.email?.trim() || undefined,
      company: input.company.trim(),
      phone: input.phone?.trim() || undefined,
    }
  }

  private validateVisitors(visitors: VisitorInput[]) {
    if (visitors.length === 0) throw new Error("En az bir ziyaretçi zorunludur.")
    const visitIds = visitors.flatMap((visitor) => visitor.visitId ? [visitor.visitId] : [])
    if (new Set(visitIds).size !== visitIds.length) throw new Error("Aynı ziyaretçi kaydı birden fazla kez gönderilemez.")
  }

  private getReferenceDataSnapshot() {
    return createMockVisitReferenceData(this.organizationStore.getSnapshot(), this.visitTypeStore.getAll())
  }
}

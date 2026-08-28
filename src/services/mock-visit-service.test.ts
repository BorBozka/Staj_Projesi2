import { afterEach, describe, expect, it, vi } from "vitest"

import type { MeetingInput, VisitRecord } from "@/domain/visits"
import { getInvitationActionLabel, getPendingInvitationVisits } from "@/features/visits/invitation-status"
import { getOwnVisits, getVisibleAdditionalRequirementNote } from "@/features/visits/visit-visibility"
import { MockVisitService } from "@/services/mock-visit-service"
import { MockVisitTypeStore } from "@/services/mock-visit-type-store"

const meetingInput: MeetingInput = {
  visitors: [{ firstName: "Test", lastName: "Ziyaretci", email: "test@example.com", company: "Test A.Ş." }],
  visitTypeId: "meeting",
  hostEmployeeName: "Maya Kara",
  hostCompanyId: "bplas",
  facilityId: "bplas-merkez",
  plannedStart: "2026-08-12T09:00:00.000Z",
  plannedEnd: "2026-08-12T10:00:00.000Z",
}

afterEach(() => vi.useRealTimers())

describe("MockVisitService Meeting–Visit behavior", () => {
  it("creates one Meeting and one Visit for a single visitor", async () => {
    const service = new MockVisitService()
    const beforeMeetings = await service.listMeetings()
    const beforeVisits = await service.listVisits()

    const created = await service.createMeeting(meetingInput)

    expect(created.visits).toHaveLength(1)
    expect(created.visits[0]).toMatchObject({ meetingId: created.meeting.id, status: "PLANNED", invitationStatus: "NOT_SENT" })
    expect(await service.listMeetings()).toHaveLength(beforeMeetings.length + 1)
    expect(await service.listVisits()).toHaveLength(beforeVisits.length + 1)
  })

  it("creates separate Visit records with the same meetingId for several visitors", async () => {
    const service = new MockVisitService()
    const created = await service.createMeeting({
      ...meetingInput,
      visitors: [
        { firstName: "Ada", lastName: "Ak", email: "ada@example.com", company: "Test A.Ş." },
        { firstName: "Bora", lastName: "Boz", email: "bora@example.com", company: "Test A.Ş." },
        { firstName: "Cem", lastName: "Can", email: "cem@example.com", company: "Test A.Ş." },
      ],
    })

    expect(new Set(created.visits.map((visit) => visit.id)).size).toBe(3)
    expect(new Set(created.visits.map((visit) => visit.meetingId))).toEqual(new Set([created.meeting.id]))
  })

  it("projects updated shared Meeting fields to every linked Visit without storing a second copy", async () => {
    const service = new MockVisitService()
    const created = await service.createMeeting({
      ...meetingInput,
      visitors: [
        { firstName: "Ada", lastName: "Ak", email: "ada@example.com", company: "Test A.Ş." },
        { firstName: "Bora", lastName: "Boz", email: "bora@example.com", company: "Test A.Ş." },
      ],
    })
    const updated = await service.updateMeeting(created.meeting.id, {
      ...meetingInput,
      note: "Ortak güncel bilgi",
      visitors: created.visits.map((visit) => ({
        visitId: visit.id,
        firstName: visit.visitor.firstName,
        lastName: visit.visitor.lastName,
        email: visit.visitor.email,
        company: visit.visitor.company,
      })),
    })

    expect(updated.visits.map((visit) => visit.note)).toEqual(["Ortak güncel bilgi", "Ortak güncel bilgi"])
    expect((await service.listMeetings()).find((meeting) => meeting.id === created.meeting.id)?.note).toBe("Ortak güncel bilgi")
    const storedRecords = (service as unknown as { visits: VisitRecord[] }).visits
    expect(storedRecords.find((visit) => visit.id === created.visits[0].id)).not.toHaveProperty("note")
  })

  it("keeps MANUAL and VISITOR_CHECK_OUT closure audit state immutable across shared-plan edits", async () => {
    const service = new MockVisitService()
    const meetings = await service.listMeetings()
    const visits = await service.listVisits()

    for (const source of ["MANUAL", "VISITOR_CHECK_OUT"] as const) {
      const closedMeeting = meetings.find((meeting) => meeting.meetingEndSource === source)!
      const linkedVisits = visits.filter((visit) => visit.meetingId === closedMeeting.id)
      const changedPlannedEnd = new Date(new Date(closedMeeting.plannedEnd).getTime() + 60 * 60_000).toISOString()

      await expect(service.updateMeeting(closedMeeting.id, {
        visitors: linkedVisits.map((visit) => ({
          visitId: visit.id,
          firstName: visit.visitor.firstName,
          lastName: visit.visitor.lastName,
          email: visit.visitor.email,
          company: visit.visitor.company,
          phone: visit.visitor.phone,
        })),
        visitTypeId: closedMeeting.visitTypeId,
        hostEmployeeName: closedMeeting.hostEmployeeName,
        hostCompanyId: closedMeeting.hostCompanyId,
        facilityId: closedMeeting.facilityId,
        plannedStart: closedMeeting.plannedStart,
        plannedEnd: changedPlannedEnd,
        note: "Kapanıştan sonra değiştirilmemeli",
      })).rejects.toThrow("Kapatılmış bir toplantının ortak bilgileri değiştirilemez")

      await expect(service.rescheduleVisit(linkedVisits[0].id, {
        plannedStart: closedMeeting.plannedStart,
        plannedEnd: changedPlannedEnd,
      })).rejects.toThrow("Kapatılmış bir toplantının ortak bilgileri değiştirilemez")

      const persisted = (await service.listMeetings()).find((meeting) => meeting.id === closedMeeting.id)
      expect(persisted).toMatchObject({
        plannedStart: closedMeeting.plannedStart,
        plannedEnd: closedMeeting.plannedEnd,
        actualMeetingEnd: closedMeeting.actualMeetingEnd,
        meetingEndSource: source,
      })
    }
  })

  it("cancels one Visit without changing the other participants", async () => {
    const service = new MockVisitService()
    const created = await service.createMeeting({
      ...meetingInput,
      visitors: [
        { firstName: "Ada", lastName: "Ak", email: "ada@example.com", company: "Test A.Ş." },
        { firstName: "Bora", lastName: "Boz", email: "bora@example.com", company: "Test A.Ş." },
      ],
    })

    await service.cancelVisit(created.visits[0].id)
    const linked = (await service.listVisits()).filter((visit) => visit.meetingId === created.meeting.id)

    expect(linked.find((visit) => visit.id === created.visits[0].id)?.status).toBe("CANCELLED")
    expect(linked.find((visit) => visit.id === created.visits[1].id)?.status).toBe("PLANNED")
  })

  it("cancels only cancellable Visits when a Meeting is cancelled", async () => {
    const service = new MockVisitService()
    const created = await service.createMeeting({
      ...meetingInput,
      visitors: [
        { firstName: "Planlı", lastName: "Kişi", email: "planned@example.com", company: "Test A.Ş." },
        { firstName: "İçeride", lastName: "Kişi", email: "inside@example.com", company: "Test A.Ş." },
        { firstName: "Çıktı", lastName: "Kişi", email: "completed@example.com", company: "Test A.Ş." },
      ],
    })
    const storedRecords = (service as unknown as { visits: VisitRecord[] }).visits
    storedRecords.find((visit) => visit.id === created.visits[1].id)!.status = "CHECKED_IN"
    storedRecords.find((visit) => visit.id === created.visits[2].id)!.status = "CHECKED_OUT"

    const cancelled = await service.cancelMeeting(created.meeting.id)

    expect(cancelled.map((visit) => visit.status)).toEqual(["CANCELLED", "CHECKED_IN", "CHECKED_OUT"])
  })

  it("accepts a visitor with no email at all", async () => {
    const service = new MockVisitService()
    const created = await service.createMeeting({
      ...meetingInput,
      visitors: [{ firstName: "Test", lastName: "Ziyaretci", company: "Test A.Ş." }],
    })
    expect(created.visits[0].visitor.email).toBeUndefined()
  })

  it("sends invitations only to email-bearing visitors in a mixed Meeting, without failing the operation", async () => {
    const service = new MockVisitService()
    const created = await service.createMeeting({
      ...meetingInput,
      visitors: [
        { firstName: "Ada", lastName: "Ak", email: "ada@example.com", company: "Test A.Ş." },
        { firstName: "Bora", lastName: "Boz", email: "bora@example.com", company: "Test A.Ş." },
        { firstName: "Cem", lastName: "Can", company: "Test A.Ş." },
      ],
    })

    const results = await service.sendMeetingInvitations(created.meeting.id)

    expect(results).toHaveLength(2)
    expect(results.map((visit) => visit.visitor.firstName).sort()).toEqual(["Ada", "Bora"])
    const noEmailVisit = (await service.listVisits()).find((visit) => visit.visitor.firstName === "Cem")!
    expect(noEmailVisit.invitationStatus).toBe("NOT_SENT")
  })

  it("rejects an explicit single-visit invitation for a visitor with no email", async () => {
    const service = new MockVisitService()
    const created = await service.createMeeting({
      ...meetingInput,
      visitors: [{ firstName: "Test", lastName: "Ziyaretci", company: "Test A.Ş." }],
    })
    await expect(service.sendVisitInvitation(created.visits[0].id)).rejects.toThrow("e-posta adresi bulunmuyor")
  })

  it("stores bulk invitation success and failure independently and retries one failed Visit", async () => {
    let failAdaOnce = true
    const deliveryAttempts: string[] = []
    const service = new MockVisitService((visit) => {
      deliveryAttempts.push(visit.id)
      if (visit.visitor.email === "ada@example.com" && failAdaOnce) {
        failAdaOnce = false
        return true
      }
      return false
    })
    const created = await service.createMeeting({
      ...meetingInput,
      visitors: [
        { firstName: "Ada", lastName: "Ak", email: "ada@example.com", company: "Test A.Ş." },
        { firstName: "Bora", lastName: "Boz", email: "bora@example.com", company: "Test A.Ş." },
      ],
    })

    const bulkResults = await service.sendMeetingInvitations(created.meeting.id)
    const failed = bulkResults.find((visit) => visit.visitor.email === "ada@example.com")!
    const sent = bulkResults.find((visit) => visit.visitor.email === "bora@example.com")!

    expect(failed.invitationStatus).toBe("FAILED")
    expect(sent.invitationStatus).toBe("SENT")
    expect(getPendingInvitationVisits(await service.listVisits()).map((visit) => visit.id)).toContain(failed.id)

    const retried = await service.sendVisitInvitation(failed.id)
    expect(retried.invitationStatus).toBe("SENT")
    expect(getInvitationActionLabel(retried)).toBe("Davet gönderildi")

    const attemptsAfterRetry = deliveryAttempts.length
    await service.sendMeetingInvitations(created.meeting.id)
    expect(deliveryAttempts).toHaveLength(attemptsAfterRetry)
  })

  it("keeps existing mock Visits attached to valid Meetings, including a grouped workshop", async () => {
    const service = new MockVisitService()
    const meetings = await service.listMeetings()
    const visits = await service.listVisits()

    const meetingIds = new Set(meetings.map((meeting) => meeting.id))
    expect(visits.every((visit) => meetingIds.has(visit.meetingId))).toBe(true)
    expect(visits.length).toBeGreaterThan(meetings.length)
    expect(visits.filter((visit) => visit.meetingId === "meeting-v-workshop-lead")).toHaveLength(2)
  })

  it("keeps phone optional and hides the additional requirement description from Security", async () => {
    const service = new MockVisitService()
    const created = await service.createMeeting({
      ...meetingInput,
      visitors: [{ firstName: "Test", lastName: "Ziyaretci", email: "test@example.com", company: "Test A.Ş.", phone: undefined }],
      note: "Güvenliğin görebileceği genel not",
      hasAdditionalRequirements: true,
      additionalRequirementNote: "Erişilebilir giriş hazırlanmalı.",
    })
    const visit = created.visits[0]

    expect(visit.visitor.phone).toBeUndefined()
    expect(visit.note).toBe("Güvenliğin görebileceği genel not")
    expect(getVisibleAdditionalRequirementNote(visit, "MANAGER")).toBe("Erişilebilir giriş hazırlanmalı.")
    expect(getVisibleAdditionalRequirementNote(visit, "EMPLOYEE")).toBe("Erişilebilir giriş hazırlanmalı.")
    expect(getVisibleAdditionalRequirementNote(visit, "SECURITY")).toBeUndefined()
  })

  it("filters personal visits strictly by creatorEmployeeId matching currentEmployee.employeeId without manager bypass", async () => {
    const service = new MockVisitService()
    const referenceData = await service.getReferenceData()
    const allVisits = await service.listVisits()
    const currentEmployeeId = referenceData.currentEmployee.employeeId

    // Personal visit filter authoritative rule: creatorEmployeeId === currentEmployee.employeeId
    const ownVisits = getOwnVisits(allVisits, currentEmployeeId)

    // 1. All filtered visits must strictly belong to current employee
    expect(ownVisits.every((visit) => visit.creatorEmployeeId === currentEmployeeId)).toBe(true)

    // 2. Personal visits must be a meaningful subset of total visits (not all 58 visits)
    expect(ownVisits.length).toBeGreaterThan(0)
    expect(ownVisits.length).toBeLessThan(allVisits.length)

    // 3. Current employee has a realistic, representative set of created visits.
    expect(ownVisits.length).toBeGreaterThanOrEqual(3)

    // 4. Other visits belong to other creators in the organization
    const otherVisits = allVisits.filter((visit) => visit.creatorEmployeeId !== currentEmployeeId)
    const otherCreators = new Set(otherVisits.map((visit) => visit.creatorEmployeeId))
    expect(otherCreators.size).toBeGreaterThanOrEqual(3)

    // Missing employee context must never fall back to exposing all visits.
    expect(getOwnVisits(allVisits)).toEqual([])
  })
})

describe("MockVisitService canonical visit types", () => {
  const visitorPayload = (visit: { id: string; visitor: { firstName: string; lastName: string; email: string; company: string; phone?: string } }) => ({
    visitId: visit.id,
    firstName: visit.visitor.firstName,
    lastName: visit.visitor.lastName,
    email: visit.visitor.email,
    company: visit.visitor.company,
    phone: visit.visitor.phone,
  })

  it("exposes a type added to the shared store in fresh reference data", async () => {
    const visitTypeStore = new MockVisitTypeStore()
    const service = new MockVisitService(undefined, undefined, visitTypeStore)
    const created = visitTypeStore.save({ name: "Denetim Takibi", active: true })

    expect((await service.getReferenceData()).visitTypes).toContainEqual({ id: created.id, name: "Denetim Takibi", active: true })
  })

  it("blocks creating a new meeting with an inactive visit type", async () => {
    const service = new MockVisitService()
    await expect(service.createMeeting({ ...meetingInput, visitTypeId: "interview" })).rejects.toThrow("Pasif ziyaret türü seçilemez.")
  })

  it("still updates an existing meeting whose visit type is inactive as long as the type is unchanged", async () => {
    const service = new MockVisitService()
    const seeded = (await service.listVisits()).find((visit) => visit.id === "v-today-no-show")!
    expect(seeded.visitTypeId).toBe("interview")

    const updated = await service.updateMeeting(seeded.meetingId, {
      visitors: [visitorPayload(seeded)],
      visitTypeId: seeded.visitTypeId,
      hostEmployeeName: seeded.hostEmployeeName,
      hostCompanyId: seeded.hostCompanyId,
      facilityId: seeded.facilityId,
      plannedStart: seeded.plannedStart,
      plannedEnd: seeded.plannedEnd,
      note: "Pasif tür korunarak güncellendi",
    })

    expect(updated.meeting).toMatchObject({ visitTypeId: "interview", visitTypeName: "İş Görüşmesi", note: "Pasif tür korunarak güncellendi" })
  })
})

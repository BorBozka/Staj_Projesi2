import { afterEach, describe, expect, it, vi } from "vitest"

import type { MeetingInput, VisitRecord } from "@/domain/visits"
import { getInvitationActionLabel, getPendingInvitationVisits } from "@/features/visits/invitation-status"
import { getVisibleAdditionalRequirementNote } from "@/features/visits/visit-visibility"
import { MockVisitService } from "@/services/mock-visit-service"

const meetingInput: MeetingInput = {
  visitors: [{ firstName: "Test", lastName: "Ziyaretci", email: "test@example.com" }],
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
        { firstName: "Ada", lastName: "Ak", email: "ada@example.com" },
        { firstName: "Bora", lastName: "Boz", email: "bora@example.com" },
        { firstName: "Cem", lastName: "Can", email: "cem@example.com" },
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
        { firstName: "Ada", lastName: "Ak", email: "ada@example.com" },
        { firstName: "Bora", lastName: "Boz", email: "bora@example.com" },
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
      })),
    })

    expect(updated.visits.map((visit) => visit.note)).toEqual(["Ortak güncel bilgi", "Ortak güncel bilgi"])
    expect((await service.listMeetings()).find((meeting) => meeting.id === created.meeting.id)?.note).toBe("Ortak güncel bilgi")
    const storedRecords = (service as unknown as { visits: VisitRecord[] }).visits
    expect(storedRecords.find((visit) => visit.id === created.visits[0].id)).not.toHaveProperty("note")
  })

  it("cancels one Visit without changing the other participants", async () => {
    const service = new MockVisitService()
    const created = await service.createMeeting({
      ...meetingInput,
      visitors: [
        { firstName: "Ada", lastName: "Ak", email: "ada@example.com" },
        { firstName: "Bora", lastName: "Boz", email: "bora@example.com" },
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
        { firstName: "Planlı", lastName: "Kişi", email: "planned@example.com" },
        { firstName: "İçeride", lastName: "Kişi", email: "inside@example.com" },
        { firstName: "Çıktı", lastName: "Kişi", email: "completed@example.com" },
      ],
    })
    const storedRecords = (service as unknown as { visits: VisitRecord[] }).visits
    storedRecords.find((visit) => visit.id === created.visits[1].id)!.status = "CHECKED_IN"
    storedRecords.find((visit) => visit.id === created.visits[2].id)!.status = "CHECKED_OUT"

    const cancelled = await service.cancelMeeting(created.meeting.id)

    expect(cancelled.map((visit) => visit.status)).toEqual(["CANCELLED", "CHECKED_IN", "CHECKED_OUT"])
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
        { firstName: "Ada", lastName: "Ak", email: "ada@example.com" },
        { firstName: "Bora", lastName: "Boz", email: "bora@example.com" },
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

  it("keeps existing mock Visits deterministically attached to one-to-one Meetings", async () => {
    const service = new MockVisitService()
    const meetings = await service.listMeetings()
    const visits = await service.listVisits()

    expect(meetings).toHaveLength(visits.length)
    expect(new Set(visits.map((visit) => visit.meetingId)).size).toBe(visits.length)
    expect(visits.every((visit) => visit.meetingId === `meeting-${visit.id}`)).toBe(true)
  })

  it("keeps phone optional and hides the additional requirement description from Security", async () => {
    const service = new MockVisitService()
    const created = await service.createMeeting({
      ...meetingInput,
      visitors: [{ firstName: "Test", lastName: "Ziyaretci", email: "test@example.com", phone: undefined }],
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
})

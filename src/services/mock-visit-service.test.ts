import { afterEach, describe, expect, it, vi } from "vitest"

import type { VisitInput } from "@/domain/visits"
import { getInvitationActionLabel, getPendingInvitationVisits } from "@/features/visits/invitation-status"
import { getVisibleAdditionalRequirementNote } from "@/features/visits/visit-visibility"
import { MockVisitService } from "@/services/mock-visit-service"

const visitInput: VisitInput = {
  visitorFirstName: "Test",
  visitorLastName: "Ziyaretci",
  visitorEmail: "test@example.com",
  visitTypeId: "meeting",
  hostEmployeeName: "Maya Kara",
  hostCompanyId: "bplas",
  facilityId: "bplas-merkez",
  plannedStart: "2026-08-12T09:00:00.000Z",
  plannedEnd: "2026-08-12T10:00:00.000Z",
}

afterEach(() => vi.useRealTimers())

describe("MockVisitService", () => {
  it("creates, updates, reschedules, and cancels a visit without deleting it", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-10T08:00:00.000Z"))
    const service = new MockVisitService()

    const created = await service.createVisit(visitInput)
    expect(created.status).toBe("PLANNED")
    expect(created.invitationStatus).toBe("NOT_SENT")
    expect(getPendingInvitationVisits(await service.listVisits()).map((visit) => visit.id)).toContain(created.id)

    const updated = await service.updateVisit(created.id, { ...visitInput, visitorFirstName: "Guncel" })
    expect(updated.visitor.firstName).toBe("Guncel")
    expect(updated.id).toBe(created.id)
    expect((await service.listVisits()).filter((visit) => visit.id === created.id)).toHaveLength(1)

    const rescheduled = await service.rescheduleVisit(created.id, {
      plannedStart: "2026-08-13T11:00:00.000Z",
      plannedEnd: "2026-08-13T12:00:00.000Z",
    })
    expect(rescheduled.plannedStart).toBe("2026-08-13T11:00:00.000Z")

    const cancelled = await service.cancelVisit(created.id)
    const visits = await service.listVisits()

    expect(cancelled.status).toBe("CANCELLED")
    expect(visits).toContainEqual(expect.objectContaining({ id: created.id, status: "CANCELLED" }))
  })

  it("sends a saved invitation and removes it from the derived action list", async () => {
    const service = new MockVisitService()
    const created = await service.createVisit(visitInput)

    const sent = await service.sendVisitInvitation(created.id)

    expect(sent.invitationStatus).toBe("SENT")
    expect(sent.invitationSentAt).toBeTruthy()
    expect(getPendingInvitationVisits(await service.listVisits()).map((visit) => visit.id)).not.toContain(created.id)
    expect(getInvitationActionLabel(sent)).toBe("Davet gönderildi")
  })

  it("keeps a failed invitation actionable for retry", async () => {
    const service = new MockVisitService(() => true)
    const created = await service.createVisit(visitInput)

    const failed = await service.sendVisitInvitation(created.id)

    expect(failed.invitationStatus).toBe("FAILED")
    expect(failed.invitationError).toBeTruthy()
    expect(getPendingInvitationVisits(await service.listVisits()).map((visit) => visit.id)).toContain(created.id)
    expect(getInvitationActionLabel(failed)).toBe("Tekrar Dene")
  })

  it("keeps phone optional and stores additional requirements separately from the general note", async () => {
    const service = new MockVisitService()
    const created = await service.createVisit({
      ...visitInput,
      visitorPhone: undefined,
      note: "Güvenliğin görebileceği genel not",
      hasAdditionalRequirements: true,
      additionalRequirementNote: "8 kişilik toplantı odası gerekiyor.",
    })

    expect(created.visitor.phone).toBeUndefined()
    expect(created.note).toBe("Güvenliğin görebileceği genel not")
    expect(created.additionalRequirementNote).toBe("8 kişilik toplantı odası gerekiyor.")
    expect(getVisibleAdditionalRequirementNote(created, "MANAGER")).toBe("8 kişilik toplantı odası gerekiyor.")
    expect(getVisibleAdditionalRequirementNote(created, "EMPLOYEE")).toBe("8 kişilik toplantı odası gerekiyor.")
    expect(getVisibleAdditionalRequirementNote(created, "SECURITY")).toBeUndefined()

    const cleared = await service.updateVisit(created.id, {
      ...visitInput,
      hasAdditionalRequirements: false,
      additionalRequirementNote: "Gönderilmemesi gereken eski not",
    })
    expect(cleared.additionalRequirementNote).toBeUndefined()
  })
})

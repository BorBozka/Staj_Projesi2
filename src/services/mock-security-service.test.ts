import { describe, expect, it } from "vitest"

import type { MeetingInput } from "@/domain/visits"
import type { VisitorCardInventoryItem, VisitorCardStatus } from "@/domain/admin"
import { MockAdminService } from "@/services/mock-admin-service"
import { MockSecurityService } from "@/services/mock-security-service"
import { MockVisitService } from "@/services/mock-visit-service"
import { MockVisitorCardStore } from "@/services/mock-visitor-card-store"

const meetingInput: MeetingInput = {
  visitors: [{ firstName: "Test", lastName: "Ziyaretci", email: "test@example.com", company: "Test A.Ş." }],
  visitTypeId: "meeting",
  hostEmployeeName: "Maya Kara",
  hostCompanyId: "bplas",
  facilityId: "bplas-merkez",
  plannedStart: "2026-08-12T09:00:00.000Z",
  plannedEnd: "2026-08-12T10:00:00.000Z",
  note: "Ortak not",
  hasAdditionalRequirements: true,
  additionalRequirementNote: "Erişilebilir giriş",
}

function setup(cards: VisitorCardInventoryItem[] = [{ id: "card-1", cardNumber: "001", status: "AVAILABLE" }]) {
  const cardStore = new MockVisitorCardStore(cards)
  const visitService = new MockVisitService()
  const security = new MockSecurityService(cardStore, visitService)
  return { cardStore, visitService, security }
}

describe("MockSecurityService shared card store", () => {
  it("lets Security see a card Admin created as AVAILABLE, and vice versa", async () => {
    const cardStore = new MockVisitorCardStore([])
    cardStore.insert({ id: "card-new", cardNumber: "099", status: "AVAILABLE" })
    const security = new MockSecurityService(cardStore, new MockVisitService())
    expect(await security.getAvailableVisitorCards()).toEqual([{ id: "card-new", cardNumber: "099", status: "AVAILABLE" }])
  })

  it("excludes a DISABLED card from Security's available list", async () => {
    const { security } = setup([{ id: "card-1", cardNumber: "001", status: "DISABLED" }])
    expect(await security.getAvailableVisitorCards()).toEqual([])
  })

  it("reflects a Security check-in as IN_USE to any other reader of the same store", async () => {
    const { cardStore, visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    await security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-1" })
    expect(cardStore.list().find((card) => card.id === "card-1")?.status).toBe("IN_USE")
  })

  it("shows a Security check-in as IN_USE through the Admin service, which then cannot edit it", async () => {
    const { cardStore, visitService, security } = setup()
    const admin = new MockAdminService(undefined, undefined, cardStore)
    const created = await visitService.createMeeting(meetingInput)

    await security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-1" })

    const adminCards = await admin.getVisitorCards()
    expect(adminCards.find((card) => card.id === "card-1")?.status).toBe("IN_USE")
    await expect(admin.updateVisitorCardInventory("card-1", { cardNumber: "001", active: false })).rejects.toThrow("Security operasyonu")
  })
})

describe("MockSecurityService checkInVisit", () => {
  it("checks a planned visit in, snapshots the card, and normalizes the plate", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)

    const result = await security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-1", vehiclePlate: " 34 abc 123 " })

    expect(result.status).toBe("CHECKED_IN")
    expect(result.actualCheckIn).toBeTruthy()
    expect(result.visitorCardId).toBe("card-1")
    expect(result.visitorCardNumber).toBe("001")
    expect(result.vehiclePlate).toBe("34 ABC 123")
    expect(result.updatedAt).not.toBe(created.visits[0].updatedAt)
  })

  it("leaves the plate undefined when none is given", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    const result = await security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-1" })
    expect(result.vehiclePlate).toBeUndefined()
  })

  it("moves the assigned card to IN_USE, linked to the visit and visitor name", async () => {
    const { cardStore, visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    const result = await security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-1" })

    const card = cardStore.get("card-1")!
    expect(card.status).toBe("IN_USE")
    expect(card.assignedVisitId).toBe(result.id)
    expect(card.assignedVisitorName).toBe(`${result.visitor.firstName} ${result.visitor.lastName}`)
  })

  it("never touches Meeting fields or invitation metadata", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    await visitService.sendVisitInvitation(created.visits[0].id)
    const beforeSend = (await visitService.listVisits()).find((visit) => visit.id === created.visits[0].id)!

    const result = await security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-1" })

    expect(result.plannedEnd).toBe(beforeSend.plannedEnd)
    expect(result.hostEmployeeName).toBe(beforeSend.hostEmployeeName)
    expect(result.invitationStatus).toBe(beforeSend.invitationStatus)
    expect(result.invitationSentAt).toBe(beforeSend.invitationSentAt)
  })

  it("rejects a missing or nonexistent card without changing the visit", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    await expect(security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "" })).rejects.toThrow("kartı bulunamadı")
    await expect(security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "no-such-card" })).rejects.toThrow("kartı bulunamadı")
    const unchanged = (await visitService.listVisits()).find((visit) => visit.id === created.visits[0].id)!
    expect(unchanged.status).toBe("PLANNED")
  })

  it.each<VisitorCardStatus>(["DISABLED", "IN_USE", "NOT_RETURNED", "LOST"])("rejects a %s card without changing the visit", async (status) => {
    const { visitService, security } = setup([{ id: "card-1", cardNumber: "001", status }])
    const created = await visitService.createMeeting(meetingInput)
    await expect(security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-1" })).rejects.toThrow("kullanılabilir değil")
    const unchanged = (await visitService.listVisits()).find((visit) => visit.id === created.visits[0].id)!
    expect(unchanged.status).toBe("PLANNED")
  })

  it("rejects a second check-in against an already CHECKED_IN visit, leaving the second card untouched", async () => {
    const { cardStore, visitService, security } = setup([
      { id: "card-1", cardNumber: "001", status: "AVAILABLE" },
      { id: "card-2", cardNumber: "002", status: "AVAILABLE" },
    ])
    const created = await visitService.createMeeting(meetingInput)
    await security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-1" })

    await expect(security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-2" })).rejects.toThrow("planlanmış ziyaretler")
    expect(cardStore.get("card-2")?.status).toBe("AVAILABLE")
  })

  it("rejects a CHECKED_OUT visit", async () => {
    const { visitService, security } = setup([
      { id: "card-1", cardNumber: "001", status: "AVAILABLE" },
      { id: "card-2", cardNumber: "002", status: "AVAILABLE" },
    ])
    const created = await visitService.createMeeting(meetingInput)
    await security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-1" })
    await visitService.checkoutVisit(created.visits[0].id)

    await expect(security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-2" })).rejects.toThrow("planlanmış ziyaretler")
  })

  it("rejects a CANCELLED visit", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    await visitService.cancelVisit(created.visits[0].id)

    await expect(security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-1" })).rejects.toThrow("planlanmış ziyaretler")
  })

  it("rejects a NO_SHOW visit", async () => {
    const cardStore = new MockVisitorCardStore()
    const visitService = new MockVisitService()
    const security = new MockSecurityService(cardStore, visitService)
    const noShow = (await visitService.listVisits()).find((visit) => visit.status === "NO_SHOW")!

    await expect(security.checkInVisit({ visitId: noShow.id, visitorCardId: "card-1" })).rejects.toThrow("planlanmış ziyaretler")
  })
})

describe("MockSecurityService correctVisitor", () => {
  it("corrects a PLANNED visitor's identity fields", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    const result = await security.correctVisitor(created.visits[0].id, { firstName: "Yeni", lastName: "Ad", company: "Yeni A.Ş.", email: "yeni@example.com", phone: "+90 532 000 00 00" })
    expect(result.visitor).toMatchObject({ firstName: "Yeni", lastName: "Ad", company: "Yeni A.Ş.", email: "yeni@example.com" })
  })

  it("corrects a CHECKED_IN visitor's identity fields", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    await security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-1" })
    const result = await security.correctVisitor(created.visits[0].id, { firstName: "Düzeltilmiş", lastName: "İsim", company: "Firma" })
    expect(result.visitor.firstName).toBe("Düzeltilmiş")
    expect(result.status).toBe("CHECKED_IN")
  })

  it("rejects correction for CHECKED_OUT, CANCELLED, and NO_SHOW visits", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    await security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-1" })
    await visitService.checkoutVisit(created.visits[0].id)
    await expect(security.correctVisitor(created.visits[0].id, { firstName: "A", lastName: "B", company: "C" })).rejects.toThrow("düzenlenebilir")

    const cancelled = await visitService.createMeeting(meetingInput)
    await visitService.cancelVisit(cancelled.visits[0].id)
    await expect(security.correctVisitor(cancelled.visits[0].id, { firstName: "A", lastName: "B", company: "C" })).rejects.toThrow("düzenlenebilir")

    const noShow = (await visitService.listVisits()).find((visit) => visit.status === "NO_SHOW")!
    await expect(security.correctVisitor(noShow.id, { firstName: "A", lastName: "B", company: "C" })).rejects.toThrow("düzenlenebilir")
  })

  it("enforces required firstName, lastName, and company", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    await expect(security.correctVisitor(created.visits[0].id, { firstName: "  ", lastName: "B", company: "C" })).rejects.toThrow("Ad zorunludur")
    await expect(security.correctVisitor(created.visits[0].id, { firstName: "A", lastName: "  ", company: "C" })).rejects.toThrow("Soyad zorunludur")
    await expect(security.correctVisitor(created.visits[0].id, { firstName: "A", lastName: "B", company: " " })).rejects.toThrow("şirketi zorunludur")
  })

  it("normalizes a blank email to undefined and rejects an invalid non-empty email", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    const cleared = await security.correctVisitor(created.visits[0].id, { firstName: "A", lastName: "B", company: "C", email: "   " })
    expect(cleared.visitor.email).toBeUndefined()
    await expect(security.correctVisitor(created.visits[0].id, { firstName: "A", lastName: "B", company: "C", email: "invalid" })).rejects.toThrow("Geçerli bir e-posta")
  })

  it("never changes Meeting-shared fields, operational status fields, or invitation metadata", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    await visitService.sendVisitInvitation(created.visits[0].id)
    const before = (await visitService.listVisits()).find((visit) => visit.id === created.visits[0].id)!

    const result = await security.correctVisitor(created.visits[0].id, { firstName: "Yeni", lastName: "İsim", company: "Farklı A.Ş." })

    expect(result.hostEmployeeName).toBe(before.hostEmployeeName)
    expect(result.visitTypeName).toBe(before.visitTypeName)
    expect(result.facilityId).toBe(before.facilityId)
    expect(result.plannedStart).toBe(before.plannedStart)
    expect(result.plannedEnd).toBe(before.plannedEnd)
    expect(result.note).toBe(before.note)
    expect(result.additionalRequirementNote).toBe(before.additionalRequirementNote)
    expect(result.status).toBe(before.status)
    expect(result.invitationStatus).toBe(before.invitationStatus)
    expect(result.invitationSentAt).toBe(before.invitationSentAt)
    expect(result.invitationError).toBe(before.invitationError)
  })
})

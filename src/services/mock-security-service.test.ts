import { afterEach, describe, expect, it, vi } from "vitest"

import type { MeetingInput } from "@/domain/visits"
import type { VisitorCardInventoryItem, VisitorCardStatus } from "@/domain/admin"
import { MockAdminService } from "@/services/mock-admin-service"
import { MockSecurityService } from "@/services/mock-security-service"
import { MockVisitService } from "@/services/mock-visit-service"
import { MockVisitorCardStore } from "@/services/mock-visitor-card-store"
import { MockVisitorRuleStore } from "@/services/mock-visitor-rule-store"
import { getInsideSecurityVisits } from "@/features/security/security-operations"

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
    const admin = new MockAdminService(undefined, undefined, undefined, cardStore)
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
    expect(result.updatedAt).toBeTruthy()
  })

  it("leaves the plate undefined when none is given", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    const result = await security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-1" })
    expect(result.vehiclePlate).toBeUndefined()
  })

  it("writes an optional gate-captured phone onto the visitor, and leaves it alone when blank", async () => {
    const { visitService, security } = setup([
      { id: "card-1", cardNumber: "001", status: "AVAILABLE" },
      { id: "card-2", cardNumber: "002", status: "AVAILABLE" },
    ])
    const withPhone = await visitService.createMeeting(meetingInput)
    const captured = await security.checkInVisit({ visitId: withPhone.visits[0].id, visitorCardId: "card-1", phone: "  +90 555 111 22 33 " })
    expect(captured.visitor.phone).toBe("+90 555 111 22 33")

    const withoutPhone = await visitService.createMeeting(meetingInput)
    const untouched = await security.checkInVisit({ visitId: withoutPhone.visits[0].id, visitorCardId: "card-2" })
    expect(untouched.visitor.phone).toBeUndefined()
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

describe("MockSecurityService createAndCheckInUnplannedVisit", () => {
  afterEach(() => vi.useRealTimers())

  const input = {
    firstName: "Aylin", lastName: "Yıldız", company: "Örnek A.Ş.", hostEmployeeName: "Serbest Metin Ev Sahibi",
    visitTypeId: "supplier", vehiclePlate: "34 abc 123", durationMinutes: 90,
    visitorCardId: "card-1", rulesAccepted: true, companyId: "bplas", facilityId: "bplas-merkez", creatorEmployeeId: "security-desk-1",
  }

  it("validates every required desk input and rule acceptance", async () => {
    const { security } = setup()
    await expect(security.createAndCheckInUnplannedVisit({ ...input, firstName: " " })).rejects.toThrow("Ad zorunludur")
    await expect(security.createAndCheckInUnplannedVisit({ ...input, rulesAccepted: false })).rejects.toThrow("kuralları kabul")
    await expect(security.createAndCheckInUnplannedVisit({ ...input, durationMinutes: 0 })).rejects.toThrow("pozitif")
  })

  it("uses the Security scope, sets exact check-in/planned-end times, and never sends an invitation", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-01T08:00:00.000Z"))
    const { cardStore, visitService, security } = setup()

    const created = await security.createAndCheckInUnplannedVisit(input)

    expect(created.status).toBe("CHECKED_IN")
    expect(created.actualCheckIn).toBe("2026-09-01T08:00:00.000Z")
    expect(created.plannedStart).toBe("2026-09-01T08:00:00.000Z")
    expect(created.plannedEnd).toBe("2026-09-01T09:30:00.000Z")
    expect(created.hostCompanyId).toBe("bplas")
    expect(created.facilityId).toBe("bplas-merkez")
    expect(created.creatorEmployeeId).toBe("security-desk-1")
    expect(created.hostEmployeeId).toBe("")
    expect(created.invitationStatus).toBe("NOT_SENT")
    expect(created.visitor.phone).toBeUndefined()
    expect(created.ruleAcceptance).toMatchObject({ method: "SECURITY_DESK", ruleId: "rule-2", ruleVersion: 2 })
    expect(cardStore.get("card-1")).toMatchObject({ status: "IN_USE", assignedVisitId: created.id })
    expect((await visitService.listVisits()).find((visit) => visit.id === created.id)?.invitationSentAt).toBeUndefined()
    expect(getInsideSecurityVisits(await visitService.listVisits(), new Date("2026-09-01T08:01:00.000Z")).map((row) => row.visit.id)).toContain(created.id)
  })

  it("rejects a non-AVAILABLE card even when a caller bypasses the dialog", async () => {
    const { security } = setup([{ id: "card-1", cardNumber: "001", status: "IN_USE" }])
    await expect(security.createAndCheckInUnplannedVisit(input)).rejects.toThrow("kullanılabilir değil")
  })

  it("requires an active Admin-published rule version", async () => {
    const cardStore = new MockVisitorCardStore([{ id: "card-1", cardNumber: "001", status: "AVAILABLE" }])
    const security = new MockSecurityService(cardStore, new MockVisitService(), new MockVisitorRuleStore([]))
    await expect(security.createAndCheckInUnplannedVisit(input)).rejects.toThrow("Aktif ziyaretçi kuralı")
  })
})

describe("MockSecurityService correctVisitor", () => {
  const hostUnchanged = { hostEmployeeName: meetingInput.hostEmployeeName }

  it("corrects a PLANNED visitor's identity fields", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    const result = await security.correctVisitor(created.visits[0].id, { firstName: "Yeni", lastName: "Ad", company: "Yeni A.Ş.", email: "yeni@example.com", phone: "+90 532 000 00 00", ...hostUnchanged })
    expect(result.visitor).toMatchObject({ firstName: "Yeni", lastName: "Ad", company: "Yeni A.Ş.", email: "yeni@example.com" })
  })

  it("corrects a CHECKED_IN visitor's identity fields", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    await security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-1" })
    const result = await security.correctVisitor(created.visits[0].id, { firstName: "Düzeltilmiş", lastName: "İsim", company: "Firma", ...hostUnchanged })
    expect(result.visitor.firstName).toBe("Düzeltilmiş")
    expect(result.status).toBe("CHECKED_IN")
  })

  it("updates the meeting-level visit type for the corrected visitor", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting({
      ...meetingInput,
      visitors: [
        ...meetingInput.visitors,
        { firstName: "İkinci", lastName: "Ziyaretçi", email: "ikinci@example.com", company: "Test A.Ş." },
      ],
    })

    const result = await security.correctVisitor(created.visits[0].id, {
      firstName: "Test",
      lastName: "Ziyaretci",
      company: "Test A.Ş.",
      visitTypeId: "customer",
      ...hostUnchanged,
    })

    expect(result).toMatchObject({ visitTypeId: "customer", visitTypeName: "Müşteri Ziyareti" })
    expect((await visitService.listVisits()).filter((visit) => visit.meetingId === created.meeting.id))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ visitTypeId: "customer", visitTypeName: "Müşteri Ziyareti" }),
        expect.objectContaining({ visitTypeId: "customer", visitTypeName: "Müşteri Ziyareti" }),
      ]))
  })

  it("leaves the visitor email untouched when the correction omits it", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    const result = await security.correctVisitor(created.visits[0].id, { firstName: "Yeni", lastName: "Ad", company: "Firma", ...hostUnchanged })
    expect(result.visitor.email).toBe("test@example.com")
  })

  it("rejects correction for CHECKED_OUT, CANCELLED, and NO_SHOW visits", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    await security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-1" })
    await visitService.checkoutVisit(created.visits[0].id)
    await expect(security.correctVisitor(created.visits[0].id, { firstName: "A", lastName: "B", company: "C", ...hostUnchanged })).rejects.toThrow("düzenlenebilir")

    const cancelled = await visitService.createMeeting(meetingInput)
    await visitService.cancelVisit(cancelled.visits[0].id)
    await expect(security.correctVisitor(cancelled.visits[0].id, { firstName: "A", lastName: "B", company: "C", ...hostUnchanged })).rejects.toThrow("düzenlenebilir")

    const noShow = (await visitService.listVisits()).find((visit) => visit.status === "NO_SHOW")!
    await expect(security.correctVisitor(noShow.id, { firstName: "A", lastName: "B", company: "C", ...hostUnchanged })).rejects.toThrow("düzenlenebilir")
  })

  it("enforces required firstName, lastName, company, and host name", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    await expect(security.correctVisitor(created.visits[0].id, { firstName: "  ", lastName: "B", company: "C", ...hostUnchanged })).rejects.toThrow("Ad zorunludur")
    await expect(security.correctVisitor(created.visits[0].id, { firstName: "A", lastName: "  ", company: "C", ...hostUnchanged })).rejects.toThrow("Soyad zorunludur")
    await expect(security.correctVisitor(created.visits[0].id, { firstName: "A", lastName: "B", company: " ", ...hostUnchanged })).rejects.toThrow("şirketi zorunludur")
    await expect(security.correctVisitor(created.visits[0].id, { firstName: "A", lastName: "B", company: "C", hostEmployeeName: "  " })).rejects.toThrow("Ev sahibi zorunludur")
  })

  it("normalizes a blank email to undefined and rejects an invalid non-empty email", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    const cleared = await security.correctVisitor(created.visits[0].id, { firstName: "A", lastName: "B", company: "C", email: "   ", ...hostUnchanged })
    expect(cleared.visitor.email).toBeUndefined()
    await expect(security.correctVisitor(created.visits[0].id, { firstName: "A", lastName: "B", company: "C", email: "invalid", ...hostUnchanged })).rejects.toThrow("Geçerli bir e-posta")
  })

  it("applies a host-name correction and stamps the audit fields without touching hostEmployeeId", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    const before = created.visits[0]

    const result = await security.correctVisitor(before.id, { firstName: "Test", lastName: "Ziyaretci", company: "Test A.Ş.", hostEmployeeName: "Deniz Şahin" })

    expect(result.hostEmployeeName).toBe("Deniz Şahin")
    expect(result.hostCorrectedFrom).toBe(before.hostEmployeeName)
    expect(result.hostCorrectedAt).toBeTruthy()
    expect(result.hostCorrectedBy).toBeTruthy()
    expect(result.hostEmployeeId).toBe(before.hostEmployeeId)
  })

  it("does not stamp host audit fields when the host name is unchanged", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    const result = await security.correctVisitor(created.visits[0].id, { firstName: "Yeni", lastName: "Ad", company: "Firma", ...hostUnchanged })
    expect(result.hostCorrectedFrom).toBeUndefined()
    expect(result.hostCorrectedAt).toBeUndefined()
    expect(result.hostCorrectedBy).toBeUndefined()
  })

  it("never changes unedited facility, schedule, note, status, or invitation metadata", async () => {
    const { visitService, security } = setup()
    const created = await visitService.createMeeting(meetingInput)
    await visitService.sendVisitInvitation(created.visits[0].id)
    const before = (await visitService.listVisits()).find((visit) => visit.id === created.visits[0].id)!

    const result = await security.correctVisitor(created.visits[0].id, { firstName: "Yeni", lastName: "İsim", company: "Farklı A.Ş.", ...hostUnchanged })

    expect(result.hostEmployeeName).toBe(before.hostEmployeeName)
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

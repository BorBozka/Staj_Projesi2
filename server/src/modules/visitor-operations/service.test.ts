import { describe, expect, it, vi } from "vitest"

import type { EmailMessage, EmailSender } from "../../delivery/email-sender.js"
import { CheckInConflictError, type VisitorOperationsRepository } from "../../repositories/visitor-operations-repository.js"
import { VisitorOperationsService, hashToken } from "./service.js"
import type { MeetingDto, VisitDto } from "./types.js"

const now = new Date("2026-09-02T10:00:00.000Z")
const meeting: MeetingDto = { id: "meeting-1", creatorEmployeeId: "employee-1", visitTypeId: "type-1", visitTypeName: "Toplantı", hostEmployeeId: "host-1", hostEmployeeName: "Maya Kara", hostCompanyId: "company-1", hostCompanyName: "BPLAS", facilityId: "facility-1", facilityName: "Merkez", plannedStart: "2026-09-03T09:00:00.000Z", plannedEnd: "2026-09-03T10:00:00.000Z", hasAdditionalRequirements: false, createdAt: now.toISOString(), updatedAt: now.toISOString() }
function visit(overrides: Partial<VisitDto> = {}): VisitDto { return { id: "visit-1", meetingId: meeting.id, visitor: { id: "visitor-1", firstName: "Ada", lastName: "Yılmaz", email: "ada@example.test", company: "Acme" }, status: "PLANNED", invitationStatus: "NOT_SENT", createdAt: now.toISOString(), updatedAt: now.toISOString(), meeting, ...overrides } }

class FakeEmailSender implements EmailSender {
  readonly messages: EmailMessage[] = []
  fail = false
  async send(message: EmailMessage) { this.messages.push(message); if (this.fail) throw new Error("smtp connection refused") }
}

function unusedRepository(overrides: Record<string, unknown>): VisitorOperationsRepository {
  return {
    listVisitTypes: async () => [], findVisitType: async () => null, saveVisitType: async () => { throw new Error("unused") }, listMeetings: async () => [], listVisits: async () => [], findMeeting: async () => null, findVisit: async () => null,
    findEmployeeByUserId: async () => null, findEmployeeById: async () => null, findActiveEmployeeByName: async () => null, getReferenceData: async () => ({}), createMeeting: async () => { throw new Error("unused") }, updateMeeting: async () => { throw new Error("unused") }, updateMeetingTimes: async () => undefined, cancelVisit: async () => undefined, cancelMeeting: async () => undefined, closeMeeting: async () => undefined,
    prepareInvitation: async () => { throw new Error("unused") }, finishInvitation: async () => undefined, findPublicPreRegistration: async () => null, updatePublicVisitor: async () => undefined, acceptPublicRule: async () => { throw new Error("unused") }, listRules: async () => [], getActiveRule: async () => null, publishRule: async () => { throw new Error("unused") }, listCards: async () => [], findCard: async () => null, saveCard: async () => { throw new Error("unused") }, setCardStatus: async () => { throw new Error("unused") }, checkIn: async () => { throw new Error("unused") }, checkOut: async () => undefined, listUnreturnedIssues: async () => [], lateReturn: async () => undefined, createUnplanned: async () => { throw new Error("unused") }, correctVisitor: async () => undefined,
    ...overrides,
  } as VisitorOperationsRepository
}

function invitationFixture(initial = visit()) {
  let current = initial
  let tokenHash: string | undefined
  const repository = unusedRepository({
    findVisit: async () => current,
    prepareInvitation: async (_id: string, value: string) => { tokenHash = value; current = { ...current, invitationStatus: "SENDING" }; return { visit: current, claimed: true } },
    finishInvitation: async (_id: string, succeeded: boolean) => { current = { ...current, invitationStatus: succeeded ? "SENT" : "FAILED", invitationError: succeeded ? undefined : "Davet teknik bir hata nedeniyle gönderilemedi." } },
  })
  return { repository, get: () => current, tokenHash: () => tokenHash }
}

describe("VisitorOperationsService invitations", () => {
  it("sends an email using a raw opaque token while persisting only its hash", async () => {
    const email = new FakeEmailSender(), fixture = invitationFixture()
    const service = new VisitorOperationsService(fixture.repository, email, "https://web.example.test", undefined, () => now, () => "opaque-token-value")

    const result = await service.sendVisitInvitation("visit-1")

    expect(result.invitationStatus).toBe("SENT")
    expect(email.messages).toHaveLength(1)
    expect(email.messages[0].text).toContain("token=opaque-token-value")
    expect(fixture.tokenHash()).toBe(hashToken("opaque-token-value"))
    expect(fixture.tokenHash()).not.toContain("opaque-token-value")
  })

  it("marks a failed delivery with the safe public error and supports retry", async () => {
    const email = new FakeEmailSender(), fixture = invitationFixture(); email.fail = true
    const service = new VisitorOperationsService(fixture.repository, email, "https://web.example.test", undefined, () => now, () => "retry-token")
    await expect(service.sendVisitInvitation("visit-1")).resolves.toMatchObject({ invitationStatus: "FAILED", invitationError: "Davet teknik bir hata nedeniyle gönderilemedi." })
    email.fail = false
    await expect(service.sendVisitInvitation("visit-1")).resolves.toMatchObject({ invitationStatus: "SENT" })
    expect(email.messages).toHaveLength(2)
  })

  it("does not send duplicate SENT invitations and skips no-email visitors in a meeting batch", async () => {
    const email = new FakeEmailSender()
    const sent = visit({ id: "sent", invitationStatus: "SENT" })
    const noEmail = visit({ id: "none", visitor: { ...visit().visitor, email: undefined } })
    const ready = visit({ id: "ready" })
    let current = ready
    const repository = unusedRepository({
      findMeeting: async () => ({ meeting, visits: [sent, noEmail, current] }),
      findVisit: async (id: string) => id === "ready" ? current : id === "sent" ? sent : noEmail,
      prepareInvitation: async () => { current = { ...current, invitationStatus: "SENDING" }; return { visit: current, claimed: true } },
      finishInvitation: async (_id: string, succeeded: boolean) => { current = { ...current, invitationStatus: succeeded ? "SENT" : "FAILED" } },
    })
    const service = new VisitorOperationsService(repository, email, "https://web.example.test", undefined, () => now, () => "batch-token")

    const results = await service.sendMeetingInvitations("meeting-1")

    expect(results).toHaveLength(1)
    expect(results[0].id).toBe("ready")
    expect(email.messages).toHaveLength(1)
    await expect(service.sendVisitInvitation("sent")).resolves.toMatchObject({ invitationStatus: "SENT" })
    expect(email.messages).toHaveLength(1)
  })

  it("resets a sent invitation during reschedule and allows it to be sent again", async () => {
    const email = new FakeEmailSender()
    let current = visit({ invitationStatus: "SENT", invitationSentAt: "2026-09-02T08:00:00.000Z" })
    const repository = unusedRepository({
      findEmployeeByUserId: async () => ({ id: "employee-1", userId: "user-1", fullName: "Ada", companyId: "company-1", facilityIds: ["facility-1"] }),
      findVisit: async () => current,
      updateMeetingTimes: async (_id: string, plannedStart: Date, plannedEnd: Date) => {
        current = { ...current, invitationStatus: "NOT_SENT", invitationSentAt: undefined, invitationError: undefined, meeting: { ...current.meeting, plannedStart: plannedStart.toISOString(), plannedEnd: plannedEnd.toISOString() } }
      },
      prepareInvitation: async () => {
        current = { ...current, invitationStatus: "SENDING" }
        return { visit: current, claimed: true }
      },
      finishInvitation: async (_id: string, succeeded: boolean) => {
        current = { ...current, invitationStatus: succeeded ? "SENT" : "FAILED", invitationSentAt: succeeded ? now.toISOString() : undefined }
      },
    })
    const service = new VisitorOperationsService(repository, email, "https://web.example.test", undefined, () => now, () => "resend-token")

    await expect(service.rescheduleVisit("visit-1", { plannedStart: "2026-09-04T09:00:00.000Z", plannedEnd: "2026-09-04T10:00:00.000Z" }, "user-1")).resolves.toMatchObject({ invitationStatus: "NOT_SENT" })
    await expect(service.sendVisitInvitation("visit-1")).resolves.toMatchObject({ invitationStatus: "SENT" })
    expect(email.messages).toHaveLength(1)
    expect(email.messages[0].text).toContain("token=resend-token")
  })
})

describe("VisitorOperationsService security delivery boundary", () => {
  it("commits planned check-in despite host email failure", async () => {
    const email = new FakeEmailSender(); email.fail = true
    const checkedIn = visit({ status: "CHECKED_IN", actualCheckIn: now.toISOString(), ruleAcceptance: { id: "acceptance-1", ruleId: "rule-1", ruleVersion: 1, acceptedAt: now.toISOString(), method: "INVITATION_LINK", contentSnapshot: "Kural" } })
    const checkIn = vi.fn(async () => ({ visit: checkedIn, hostEmail: "host@example.test", hostName: "Maya Kara" }))
    const repository = unusedRepository({ findVisit: async () => visit({ ruleAcceptance: checkedIn.ruleAcceptance }), findCard: async () => ({ id: "card-1", cardNumber: "001", status: "AVAILABLE", createdAt: now.toISOString(), updatedAt: now.toISOString() }), checkIn })
    const service = new VisitorOperationsService(repository, email, "https://web.example.test", undefined, () => now)

    await expect(service.checkInVisit("visit-1", { visitorCardId: "card-1" })).resolves.toEqual(checkedIn)
    await new Promise((resolve) => setImmediate(resolve))
    expect(checkIn).toHaveBeenCalledOnce()
    expect(email.messages).toHaveLength(1)
  })

  it("does not attempt host notification for unplanned free-text hosts", async () => {
    const email = new FakeEmailSender()
    const repository = unusedRepository({
      findEmployeeByUserId: async () => ({ id: "security-1", userId: "user-1", fullName: "Güvenlik", companyId: "company-1", facilityIds: ["facility-1"] }),
      findVisitType: async () => ({ id: "type-1", name: "Toplantı", active: true, createdAt: now.toISOString(), updatedAt: now.toISOString() }),
      createUnplanned: async () => visit({ status: "CHECKED_IN", actualCheckIn: now.toISOString() }),
    })
    const service = new VisitorOperationsService(repository, email, "https://web.example.test", undefined, () => now)
    await service.createAndCheckInUnplanned({ firstName: "Ada", lastName: "Yılmaz", company: "Acme", hostEmployeeName: "Serbest Ev Sahibi", visitTypeId: "type-1", durationMinutes: 30, visitorCardId: "card-1", rulesAccepted: true, companyId: "company-1", facilityId: "facility-1" }, "user-1")
    expect(email.messages).toHaveLength(0)
  })

  it("maps a concurrent check-in loser to a safe conflict", async () => {
    const accepted = { id: "acceptance-1", ruleId: "rule-1", ruleVersion: 1, acceptedAt: now.toISOString(), method: "INVITATION_LINK" as const, contentSnapshot: "Kural" }
    const repository = unusedRepository({
      findVisit: async () => visit({ ruleAcceptance: accepted }),
      findCard: async () => ({ id: "card-1", cardNumber: "001", status: "AVAILABLE", createdAt: now.toISOString(), updatedAt: now.toISOString() }),
      checkIn: async () => { throw new CheckInConflictError() },
    })
    const service = new VisitorOperationsService(repository, new FakeEmailSender(), "https://web.example.test", undefined, () => now)

    await expect(service.checkInVisit("visit-1", { visitorCardId: "card-1" })).rejects.toMatchObject({
      statusCode: 409,
      code: "CHECK_IN_CONFLICT",
      message: "Ziyaret veya kart durumu değişti. Güncel durumu kontrol edip yeniden deneyin.",
    })
  })
})

describe("Visitor operations state guards", () => {
  it("keeps inactive types usable in history but rejects them for a new meeting", async () => {
    const email = new FakeEmailSender()
    const inactive = { id: "type-1", name: "Eski", active: false, createdAt: now.toISOString(), updatedAt: now.toISOString() }
    const repository = unusedRepository({ listVisitTypes: async () => [inactive], findVisitType: async () => inactive, findEmployeeByUserId: async () => ({ id: "employee-1", userId: "user-1", fullName: "Maya", companyId: "company-1", facilityIds: ["facility-1"] }), findActiveEmployeeByName: async () => ({ id: "host-1", userId: "host-user", fullName: "Maya", companyId: "company-1", facilityIds: ["facility-1"] }) })
    const service = new VisitorOperationsService(repository, email, "https://web.example.test", undefined, () => now)
    await expect(service.createMeeting({ visitors: [{ firstName: "Ada", lastName: "Yılmaz", company: "Acme" }], visitTypeId: "type-1", hostEmployeeName: "Maya", hostCompanyId: "company-1", facilityId: "facility-1", plannedStart: "2026-09-03T09:00:00.000Z", plannedEnd: "2026-09-03T10:00:00.000Z" }, "user-1")).rejects.toMatchObject({ code: "INACTIVE_VISIT_TYPE" })
  })

  it("allows only NOT_RETURNED to LOST and LOST to AVAILABLE", async () => {
    const email = new FakeEmailSender(), setStatus = vi.fn(async (_id: string, status: string) => ({ id: "card-1", cardNumber: "001", status: status as "LOST", createdAt: now.toISOString(), updatedAt: now.toISOString() }))
    const repository = unusedRepository({ findCard: async () => ({ id: "card-1", cardNumber: "001", status: "NOT_RETURNED", createdAt: now.toISOString(), updatedAt: now.toISOString() }), setCardStatus: setStatus })
    const service = new VisitorOperationsService(repository, email, "https://web.example.test", undefined, () => now)
    await expect(service.markCardLost("card-1")).resolves.toMatchObject({ status: "LOST" })
    expect(setStatus).toHaveBeenCalledWith("card-1", "LOST")
  })
})

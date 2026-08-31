import { describe, expect, it } from "vitest"

import type { MeetingInput } from "@/domain/visits"
import { MockAdminService } from "@/services/mock-admin-service"
import { MockSecurityService } from "@/services/mock-security-service"
import { MockVisitService } from "@/services/mock-visit-service"
import { MockVisitorCardStore } from "@/services/mock-visitor-card-store"

const meetingInput: MeetingInput = {
  visitors: [{ firstName: "Deniz", lastName: "Ak", email: "deniz@example.com", company: "Delta A.Ş." }],
  visitTypeId: "meeting",
  hostEmployeeName: "Maya Kara",
  hostCompanyId: "bplas",
  facilityId: "bplas-merkez",
  plannedStart: "2026-08-12T09:00:00.000Z",
  plannedEnd: "2026-08-12T10:00:00.000Z",
}

async function checkedInFixture() {
  const cardStore = new MockVisitorCardStore([{ id: "card-1", cardNumber: "001", status: "AVAILABLE" }])
  const visitService = new MockVisitService()
  const security = new MockSecurityService(cardStore, visitService)
  const created = await visitService.createMeeting(meetingInput)
  const visit = await security.checkInVisit({ visitId: created.visits[0].id, visitorCardId: "card-1" })
  return { cardStore, visitService, security, visit }
}

describe("MockSecurityService checkOutVisit", () => {
  it("checks out an assigned visitor, records a returned card, and releases it", async () => {
    const { cardStore, security, visit } = await checkedInFixture()

    const checkedOut = await security.checkOutVisit({ visitId: visit.id, cardReturned: true })

    expect(checkedOut).toMatchObject({ status: "CHECKED_OUT", visitorCardReturned: true })
    expect(checkedOut.actualCheckOut).toBeTruthy()
    expect(cardStore.get("card-1")).toEqual({ id: "card-1", cardNumber: "001", status: "AVAILABLE" })
  })

  it("checks out an assigned visitor without a return and keeps the card-to-visit link", async () => {
    const { cardStore, security, visit } = await checkedInFixture()

    const checkedOut = await security.checkOutVisit({ visitId: visit.id, cardReturned: false })

    expect(checkedOut).toMatchObject({ status: "CHECKED_OUT", visitorCardReturned: false })
    expect(cardStore.get("card-1")).toMatchObject({ status: "NOT_RETURNED", assignedVisitId: visit.id, assignedVisitorName: "Deniz Ak" })
    await expect(security.checkOutVisit({ visitId: visit.id, cardReturned: true })).rejects.toThrow("içerideki")
  })

  it("uses VisitService checkout so the final checked-out visitor still auto-closes its meeting", async () => {
    const { visitService, security, visit } = await checkedInFixture()

    await security.checkOutVisit({ visitId: visit.id, cardReturned: true })

    const meeting = (await visitService.listMeetings()).find((item) => item.id === visit.meetingId)!
    expect(meeting).toMatchObject({ meetingEndSource: "VISITOR_CHECK_OUT" })
    expect(meeting.actualMeetingEnd).toBeTruthy()
  })

  it("rejects an unassigned, wrong, or non-IN_USE card transaction without checking the visit out", async () => {
    const { cardStore, visitService, security, visit } = await checkedInFixture()
    const assigned = cardStore.get("card-1")!
    cardStore.replace(assigned.id, { ...assigned, status: "AVAILABLE" })

    await expect(security.checkOutVisit({ visitId: visit.id, cardReturned: true })).rejects.toThrow("kullanımda değil")
    expect((await visitService.listVisits()).find((item) => item.id === visit.id)?.status).toBe("CHECKED_IN")
  })
})

describe("MockSecurityService late visitor-card returns", () => {
  async function notReturnedFixture() {
    const fixture = await checkedInFixture()
    const checkedOut = await fixture.security.checkOutVisit({ visitId: fixture.visit.id, cardReturned: false })
    return { ...fixture, checkedOut }
  }

  it("lists only linked NOT_RETURNED cards and resolves a late return without reopening the visit", async () => {
    const { cardStore, security, checkedOut } = await notReturnedFixture()
    const checkoutTime = checkedOut.actualCheckOut

    expect(await security.getUnreturnedVisitorCardIssues()).toHaveLength(1)
    const returned = await security.receiveReturnedVisitorCard(checkedOut.id)

    expect(returned).toMatchObject({ status: "CHECKED_OUT", visitorCardReturned: true, actualCheckOut: checkoutTime })
    expect(cardStore.get("card-1")).toEqual({ id: "card-1", cardNumber: "001", status: "AVAILABLE" })
    expect(await security.getUnreturnedVisitorCardIssues()).toEqual([])
  })

  it("rejects late returns for cards outside the NOT_RETURNED operational state", async () => {
    const { security, visit } = await checkedInFixture()
    await expect(security.receiveReturnedVisitorCard(visit.id)).rejects.toThrow("uygun ziyaret")
  })

  it("keeps the shared Admin write-off and restore lifecycle intact", async () => {
    const { cardStore, security, checkedOut } = await notReturnedFixture()
    const admin = new MockAdminService(undefined, undefined, undefined, cardStore)

    await admin.markVisitorCardLost("card-1")
    expect(cardStore.get("card-1")?.status).toBe("LOST")
    await expect(security.receiveReturnedVisitorCard(checkedOut.id)).rejects.toThrow("iade edilmemiş")

    await admin.restoreVisitorCard("card-1")
    expect(cardStore.get("card-1")).toEqual({ id: "card-1", cardNumber: "001", status: "AVAILABLE" })
    expect(await security.getUnreturnedVisitorCardIssues()).toEqual([])
  })
})

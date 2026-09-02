import type { PrismaClient } from "@prisma/client"
import { describe, expect, it, vi } from "vitest"

import type { MeetingInput } from "../modules/visitor-operations/types.js"
import { PrismaVisitorOperationsRepository } from "./visitor-operations-repository.js"

const sentAt = new Date("2026-09-02T08:00:00.000Z")
const updatedAt = new Date("2026-09-02T09:00:00.000Z")

function createMeetingFixture() {
  const meeting: any = {
    id: "meeting-1",
    creatorEmployeeId: "employee-1",
    visitTypeId: "type-1",
    hostEmployeeId: "host-1",
    hostEmployeeName: "Maya Kara",
    hostCompanyId: "company-1",
    facilityId: "facility-1",
    plannedStart: new Date("2026-09-03T09:00:00.000Z"),
    plannedEnd: new Date("2026-09-03T10:00:00.000Z"),
    note: null,
    hasAdditionalRequirements: false,
    additionalRequirementNote: null,
    actualMeetingEnd: null,
    meetingEndSource: null,
    createdAt: updatedAt,
    updatedAt,
    visitType: { name: "Toplantı" },
    hostCompany: { name: "BPLAS" },
    facility: { name: "Merkez" },
    visits: [] as any[],
  }
  const planned = {
    id: "visit-planned",
    meetingId: meeting.id,
    visitorId: "visitor-planned",
    visitor: { id: "visitor-planned", firstName: "Ada", lastName: "Yılmaz", email: "ada@example.test", company: "Acme", phone: null },
    meeting,
    status: "PLANNED",
    invitationStatus: "SENT",
    invitationSentAt: sentAt,
    invitationError: "historical planned error",
    actualCheckIn: null,
    actualCheckOut: null,
    visitorCardReturned: null,
    visitorCardId: null,
    visitorCardNumber: null,
    vehiclePlate: null,
    cancelledAt: null,
    createdAt: updatedAt,
    updatedAt,
    ruleAcceptances: [],
    hostCorrectionAudits: [],
  }
  const terminal = {
    ...planned,
    id: "visit-terminal",
    visitorId: "visitor-terminal",
    visitor: { id: "visitor-terminal", firstName: "Deniz", lastName: "Yılmaz", email: "deniz@example.test", company: "Acme", phone: null },
    status: "CHECKED_OUT",
    invitationError: "historical terminal error",
  }
  meeting.visits = [planned, terminal]
  const invitation = { visitId: planned.id, tokenHash: "existing-token-hash" }

  const meetingUpdate = vi.fn(async ({ data }: any) => Object.assign(meeting, data))
  const visitUpdateMany = vi.fn(async ({ where, data }: any) => {
    let count = 0
    for (const visit of meeting.visits) {
      if (visit.meetingId === where.meetingId && visit.status === where.status) {
        Object.assign(visit, data)
        count += 1
      }
    }
    return { count }
  })
  const tx = {
    meeting: { update: meetingUpdate },
    visit: {
      findUnique: vi.fn(async ({ where }: any) => meeting.visits.find((visit: any) => visit.id === where.id) ?? null),
      updateMany: visitUpdateMany,
    },
    visitor: {
      update: vi.fn(async ({ where, data }: any) => {
        const visit = meeting.visits.find((item: any) => item.visitorId === where.id)
        return Object.assign(visit.visitor, data)
      }),
    },
  }
  const prisma = {
    $transaction: vi.fn(async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx)),
    meeting: { findUnique: vi.fn(async () => meeting) },
  } as unknown as PrismaClient

  return { invitation, meeting, meetingUpdate, planned, prisma, terminal, visitUpdateMany }
}

const meetingInput: MeetingInput = {
  visitors: [
    { visitId: "visit-planned", firstName: "Ada", lastName: "Yılmaz", email: "ada@example.test", company: "Acme" },
    { visitId: "visit-terminal", firstName: "Deniz", lastName: "Yılmaz", email: "deniz@example.test", company: "Acme" },
  ],
  visitTypeId: "type-1",
  hostEmployeeId: "host-1",
  hostEmployeeName: "Maya Kara",
  hostCompanyId: "company-1",
  facilityId: "facility-1",
  plannedStart: "2026-09-04T09:00:00.000Z",
  plannedEnd: "2026-09-04T10:00:00.000Z",
}

describe("PrismaVisitorOperationsRepository invitation resets", () => {
  it("resets only planned invitations atomically with a meeting edit and preserves the token", async () => {
    const fixture = createMeetingFixture()
    const repository = new PrismaVisitorOperationsRepository(fixture.prisma)

    const result = await repository.updateMeeting("meeting-1", meetingInput, "host-1")

    expect(result.visits.find((visit) => visit.id === "visit-planned")).toMatchObject({
      invitationStatus: "NOT_SENT",
      invitationSentAt: undefined,
      invitationError: undefined,
    })
    expect(result.visits.find((visit) => visit.id === "visit-terminal")).toMatchObject({
      status: "CHECKED_OUT",
      invitationStatus: "SENT",
      invitationSentAt: sentAt.toISOString(),
      invitationError: "historical terminal error",
    })
    expect(fixture.invitation).toEqual({ visitId: "visit-planned", tokenHash: "existing-token-hash" })
    expect(fixture.visitUpdateMany).toHaveBeenCalledWith({
      where: { meetingId: "meeting-1", status: "PLANNED" },
      data: { invitationStatus: "NOT_SENT", invitationSentAt: null, invitationError: null },
    })
  })

  it("resets a sent planned invitation atomically with rescheduling and leaves terminal history unchanged", async () => {
    const fixture = createMeetingFixture()
    const repository = new PrismaVisitorOperationsRepository(fixture.prisma)
    const nextStart = new Date("2026-09-05T09:00:00.000Z")
    const nextEnd = new Date("2026-09-05T10:00:00.000Z")

    await repository.updateMeetingTimes("meeting-1", nextStart, nextEnd)

    expect(fixture.meeting).toMatchObject({ plannedStart: nextStart, plannedEnd: nextEnd })
    expect(fixture.planned).toMatchObject({ invitationStatus: "NOT_SENT", invitationSentAt: null, invitationError: null })
    expect(fixture.terminal).toMatchObject({ invitationStatus: "SENT", invitationSentAt: sentAt, invitationError: "historical terminal error" })
    expect(fixture.prisma.$transaction).toHaveBeenCalledOnce()
  })
})

describe("PrismaVisitorOperationsRepository card audit identity", () => {
  it("keeps assignment on LOST and clears it only when restored to AVAILABLE", async () => {
    let card = {
      id: "card-1",
      cardNumber: "001",
      status: "NOT_RETURNED",
      currentVisitId: "visit-1",
      assignedVisitorName: "Ada Yılmaz",
      createdAt: updatedAt,
      updatedAt,
    }
    const prisma = {
      visitorCard: {
        update: vi.fn(async ({ data }: any) => {
          card = { ...card, ...data }
          return card
        }),
      },
    } as unknown as PrismaClient
    const repository = new PrismaVisitorOperationsRepository(prisma)

    await expect(repository.setCardStatus("card-1", "LOST")).resolves.toMatchObject({
      status: "LOST",
      assignedVisitId: "visit-1",
      assignedVisitorName: "Ada Yılmaz",
    })
    await expect(repository.setCardStatus("card-1", "AVAILABLE")).resolves.toMatchObject({
      status: "AVAILABLE",
      assignedVisitId: undefined,
      assignedVisitorName: undefined,
    })
  })
})

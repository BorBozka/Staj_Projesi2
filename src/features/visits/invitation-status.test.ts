import { describe, expect, it } from "vitest"

import type { Visit, VisitStatus } from "@/domain/visits"
import { formatInvitationSentAt, getActionRequiredInvitationVisits, getPendingInvitationVisits } from "@/features/visits/invitation-status"

function makeVisit(id: string, status: VisitStatus, overrides: Partial<Visit> = {}): Visit {
  return {
    id,
    meetingId: `meeting-${id}`,
    creatorEmployeeId: "creator-1",
    visitor: { id: `visitor-${id}`, firstName: id, lastName: "Ziyaretçi", email: "visitor@example.com", company: "Örnek Firma" },
    visitTypeId: "meeting",
    visitTypeName: "Toplantı",
    hostEmployeeId: "host-1",
    hostEmployeeName: "İpek Işık",
    hostCompanyId: "bplas",
    hostCompanyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: "2026-08-28T12:30:00+03:00",
    plannedEnd: "2026-08-28T13:00:00+03:00",
    status,
    invitationStatus: "NOT_SENT",
    hasAdditionalRequirements: false,
    createdAt: "2026-08-28T09:00:00+03:00",
    updatedAt: "2026-08-28T09:00:00+03:00",
    ...overrides,
  }
}

describe("getPendingInvitationVisits", () => {
  it("excludes a PLANNED visit whose visitor has no email", () => {
    const noEmail = makeVisit("no-email", "PLANNED", { visitor: { id: "v1", firstName: "A", lastName: "B", email: undefined, company: "C" } })
    const withEmail = makeVisit("with-email", "PLANNED")
    expect(getPendingInvitationVisits([noEmail, withEmail]).map((visit) => visit.id)).toEqual(["with-email"])
  })
})

describe("getActionRequiredInvitationVisits", () => {
  it("never returns a visit whose visitor has no email, even when otherwise action-required", () => {
    const noEmail = makeVisit("no-email", "PLANNED", { creatorEmployeeId: "creator-1", visitor: { id: "v1", firstName: "A", lastName: "B", email: undefined, company: "C" } })
    const withEmail = makeVisit("with-email", "PLANNED", { creatorEmployeeId: "creator-1" })
    expect(getActionRequiredInvitationVisits([noEmail, withEmail], "creator-1").map((visit) => visit.id)).toEqual(["with-email"])
  })
})

describe("formatInvitationSentAt", () => {
  it("uses the long Turkish month format the details dialog shows dates in", () => {
    expect(formatInvitationSentAt(new Date(2026, 8, 1, 9, 15).toISOString())).toBe("1 Eylül 2026 · 09:15")
  })
})

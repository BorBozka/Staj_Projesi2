import { afterEach, describe, expect, it, vi } from "vitest"

import type { Visit, VisitStatus } from "@/domain/visits"
import { getUpcomingVisits } from "@/features/visits/upcoming-visits"

function visitWithStatus(id: string, plannedStart: string, status: VisitStatus): Visit {
  return {
    id,
    meetingId: `meeting-${id}`,
    creatorEmployeeId: "creator-1",
    visitor: { id: `visitor-${id}`, firstName: "Test", lastName: "Kisi", email: "test@example.com" },
    visitTypeId: "meeting",
    visitTypeName: "Toplanti",
    hostEmployeeId: "maya-kara",
    hostEmployeeName: "Maya Kara",
    hostCompanyId: "bplas",
    hostCompanyName: "BPLAS",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart,
    plannedEnd: plannedStart,
    status,
    invitationStatus: "SENT",
    hasAdditionalRequirements: false,
    createdAt: plannedStart,
    updatedAt: plannedStart,
  }
}

afterEach(() => vi.useRealTimers())

describe("getUpcomingVisits", () => {
  it("returns only planned visits that start in the future", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-10T10:00:00.000Z"))
    const now = new Date()
    const visits = [
      visitWithStatus("past", "2026-08-10T09:00:00.000Z", "PLANNED"),
      visitWithStatus("checked-in", "2026-08-10T11:00:00.000Z", "CHECKED_IN"),
      visitWithStatus("future", "2026-08-10T12:00:00.000Z", "PLANNED"),
    ]

    expect(getUpcomingVisits(visits, now).map((visit) => visit.id)).toEqual(["future"])
  })
})

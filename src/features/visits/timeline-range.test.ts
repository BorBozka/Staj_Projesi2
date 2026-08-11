import { describe, expect, it } from "vitest"

import type { Visit } from "@/domain/visits"
import { getTimelineRange } from "@/features/visits/timeline-range"

function visitAt(hour: number, minute: number, endHour: number, endMinute: number): Visit {
  const start = new Date(2026, 7, 10, hour, minute)
  const end = new Date(2026, 7, 10, endHour, endMinute)
  return {
    id: `${hour}-${minute}`,
    meetingId: `meeting-${hour}-${minute}`,
    creatorEmployeeId: "creator-1",
    visitor: { id: "visitor", firstName: "Test", lastName: "Kisi", email: "test@example.com" },
    visitTypeId: "meeting",
    visitTypeName: "Toplanti",
    hostEmployeeId: "maya-kara",
    hostEmployeeName: "Maya Kara",
    hostCompanyId: "bplas",
    hostCompanyName: "BPLAS",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: start.toISOString(),
    plannedEnd: end.toISOString(),
    status: "PLANNED",
    invitationStatus: "SENT",
    hasAdditionalRequirements: false,
    createdAt: start.toISOString(),
    updatedAt: start.toISOString(),
  }
}

describe("getTimelineRange", () => {
  it("uses the default 08:00–18:00 range when there are no visits", () => {
    expect(getTimelineRange([])).toEqual({ startMinutes: 480, endMinutes: 1080 })
  })

  it("extends the axis for valid visits outside the default range", () => {
    expect(getTimelineRange([visitAt(6, 30, 20, 15)])).toEqual({ startMinutes: 300, endMinutes: 1320 })
  })
})

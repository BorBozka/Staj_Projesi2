import { describe, expect, it } from "vitest"

import type { Meeting, VisitRecord } from "@/domain/visits"
import {
  areAllLinkedVisitsTerminal,
  canEmployeeManageMeetingLifecycle,
  computeExtendedPlannedEnd,
  computeMeetingEndVarianceMinutes,
  getManualMeetingLifecycleBlockReason,
  getOverdueOpenHostedMeetings,
  isMeetingExplicitlyClosed,
  isMeetingResourceReadOnly,
  isMeetingOvertime,
} from "@/lib/meeting-lifecycle"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: "m-1",
    creatorEmployeeId: "emp-1",
    visitTypeId: "vt-1",
    visitTypeName: "Toplantı",
    hostEmployeeId: "emp-1",
    hostEmployeeName: "Test Çalışan",
    hostCompanyId: "co-1",
    hostCompanyName: "Test Şirket",
    facilityId: "fac-1",
    facilityName: "Test Tesis",
    plannedStart: "2026-08-13T09:00:00.000Z",
    plannedEnd: "2026-08-13T10:00:00.000Z",
    hasAdditionalRequirements: false,
    createdAt: "2026-08-13T08:00:00.000Z",
    updatedAt: "2026-08-13T08:00:00.000Z",
    ...overrides,
  }
}

function makeVisit(meeting: Meeting, status: VisitRecord["status"] = "CHECKED_IN", id = `visit-${meeting.id}`): VisitRecord {
  return {
    id,
    meetingId: meeting.id,
    visitor: { id: `visitor-${id}`, firstName: "Test", lastName: "Ziyaretçi", email: "test@example.com" },
    status,
    invitationStatus: "SENT",
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,
  }
}

// ---------------------------------------------------------------------------
// isMeetingExplicitlyClosed
// ---------------------------------------------------------------------------

describe("isMeetingExplicitlyClosed", () => {
  it("returns false when actualMeetingEnd is absent", () => {
    expect(isMeetingExplicitlyClosed(makeMeeting())).toBe(false)
  })

  it("returns true when actualMeetingEnd is set", () => {
    expect(isMeetingExplicitlyClosed(makeMeeting({ actualMeetingEnd: "2026-08-13T10:05:00.000Z" }))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// isMeetingOvertime
// ---------------------------------------------------------------------------

describe("isMeetingOvertime", () => {
  it("returns false when now is before plannedEnd and meeting is open", () => {
    const now = new Date("2026-08-13T09:30:00.000Z")
    expect(isMeetingOvertime(makeMeeting(), now)).toBe(false)
  })

  it("returns true when now is after plannedEnd and meeting is open", () => {
    const now = new Date("2026-08-13T10:15:00.000Z")
    expect(isMeetingOvertime(makeMeeting(), now)).toBe(true)
  })

  it("returns false even when overtime if meeting is already closed", () => {
    const now = new Date("2026-08-13T10:15:00.000Z")
    const closed = makeMeeting({ actualMeetingEnd: "2026-08-13T10:05:00.000Z" })
    expect(isMeetingOvertime(closed, now)).toBe(false)
  })
})

describe("shared lifecycle eligibility", () => {
  it("requires host identity, planned start, an open Meeting, and a non-terminal linked Visit", () => {
    const meeting = makeMeeting({ hostEmployeeId: "host-1" })
    const activeVisits = [makeVisit(meeting)]

    expect(getManualMeetingLifecycleBlockReason(meeting, activeVisits, "creator-1", new Date("2026-08-13T10:00:00.000Z"))).toBe("NOT_HOST")
    expect(getManualMeetingLifecycleBlockReason(meeting, activeVisits, "host-1", new Date("2026-08-13T08:59:59.000Z"))).toBe("NOT_STARTED")
    expect(getManualMeetingLifecycleBlockReason({ ...meeting, actualMeetingEnd: "2026-08-13T09:30:00.000Z" }, activeVisits, "host-1", new Date("2026-08-13T10:00:00.000Z"))).toBe("CLOSED")
    expect(getManualMeetingLifecycleBlockReason(meeting, [], "host-1", new Date("2026-08-13T10:00:00.000Z"))).toBe("NO_LINKED_VISITS")
    expect(getManualMeetingLifecycleBlockReason(meeting, [makeVisit(meeting, "CANCELLED")], "host-1", new Date("2026-08-13T10:00:00.000Z"))).toBe("TERMINAL")
    expect(getManualMeetingLifecycleBlockReason(meeting, activeVisits, "host-1", new Date("2026-08-13T10:00:00.000Z"))).toBeNull()
  })

  it("uses the same closed-or-terminal predicate for resource read-only state", () => {
    const meeting = makeMeeting()

    expect(isMeetingResourceReadOnly(meeting, [makeVisit(meeting)])).toBe(false)
    expect(isMeetingResourceReadOnly({ ...meeting, actualMeetingEnd: "2026-08-13T09:30:00.000Z" }, [makeVisit(meeting)])).toBe(true)
    expect(isMeetingResourceReadOnly(meeting, [makeVisit(meeting, "CHECKED_OUT")])).toBe(true)
    expect(areAllLinkedVisitsTerminal(meeting.id, [])).toBe(false)
  })
})

describe("host lifecycle authorization and notification selection", () => {
  it("grants lifecycle actions only to the host, not a non-host creator", () => {
    const meeting = makeMeeting({ creatorEmployeeId: "creator-1", hostEmployeeId: "host-1" })

    expect(canEmployeeManageMeetingLifecycle(meeting, "host-1")).toBe(true)
    expect(canEmployeeManageMeetingLifecycle(meeting, "creator-1")).toBe(false)
  })

  it("selects overdue open meetings by host identity regardless of creator", () => {
    const now = new Date("2026-08-13T10:00:00.000Z")
    const hostedByCurrentEmployee = makeMeeting({
      id: "hosted",
      creatorEmployeeId: "another-employee",
      hostEmployeeId: "current-employee",
      plannedEnd: now.toISOString(),
    })
    const createdButNotHosted = makeMeeting({
      id: "created",
      creatorEmployeeId: "current-employee",
      hostEmployeeId: "another-employee",
      plannedEnd: "2026-08-13T09:00:00.000Z",
    })
    const closedHostedMeeting = makeMeeting({
      id: "closed",
      hostEmployeeId: "current-employee",
      plannedEnd: "2026-08-13T08:00:00.000Z",
      actualMeetingEnd: "2026-08-13T08:10:00.000Z",
    })
    const futureHostedMeeting = makeMeeting({
      id: "future",
      hostEmployeeId: "current-employee",
      plannedEnd: "2026-08-13T10:01:00.000Z",
    })

    const meetings = [
      futureHostedMeeting,
      createdButNotHosted,
      hostedByCurrentEmployee,
      closedHostedMeeting,
    ]
    const visits = meetings.map((meeting) => makeVisit(meeting))

    expect(getOverdueOpenHostedMeetings(meetings, visits, "current-employee", now)
      .map((meeting) => meeting.id)).toEqual(["hosted"])
  })

  it("excludes overdue hosted meetings whose linked Visits are all terminal", () => {
    const now = new Date("2026-08-13T10:00:00.000Z")
    const active = makeMeeting({ id: "active", hostEmployeeId: "host", plannedEnd: "2026-08-13T09:00:00.000Z" })
    const checkedOut = makeMeeting({ id: "checked-out", hostEmployeeId: "host", plannedEnd: "2026-08-13T08:00:00.000Z" })
    const cancelled = makeMeeting({ id: "cancelled", hostEmployeeId: "host", plannedEnd: "2026-08-13T08:00:00.000Z" })
    const noShow = makeMeeting({ id: "no-show", hostEmployeeId: "host", plannedEnd: "2026-08-13T08:00:00.000Z" })
    const withoutVisits = makeMeeting({ id: "without-visits", hostEmployeeId: "host", plannedEnd: "2026-08-13T08:00:00.000Z" })
    const meetings = [checkedOut, cancelled, noShow, withoutVisits, active]
    const visits = [
      makeVisit(checkedOut, "CHECKED_OUT"),
      makeVisit(cancelled, "CANCELLED"),
      makeVisit(noShow, "NO_SHOW"),
      makeVisit(active, "CHECKED_IN"),
    ]

    expect(getOverdueOpenHostedMeetings(meetings, visits, "host", now)
      .map((meeting) => meeting.id)).toEqual(["active"])
  })

  it("orders multiple notifications by planned end", () => {
    const meetings = [
      makeMeeting({ id: "later", hostEmployeeId: "host", plannedEnd: "2026-08-13T09:30:00.000Z" }),
      makeMeeting({ id: "earlier", hostEmployeeId: "host", plannedEnd: "2026-08-13T09:00:00.000Z" }),
    ]

    const visits = meetings.map((meeting) => makeVisit(meeting))

    expect(getOverdueOpenHostedMeetings(meetings, visits, "host", new Date("2026-08-13T10:00:00.000Z"))
      .map((meeting) => meeting.id)).toEqual(["earlier", "later"])
  })
})

// ---------------------------------------------------------------------------
// computeMeetingEndVarianceMinutes
// ---------------------------------------------------------------------------

describe("computeMeetingEndVarianceMinutes", () => {
  it("returns null when meeting is not closed", () => {
    expect(computeMeetingEndVarianceMinutes(makeMeeting())).toBeNull()
  })

  it("returns 0 when meeting closed exactly on time", () => {
    const m = makeMeeting({ actualMeetingEnd: "2026-08-13T10:00:00.000Z" })
    expect(computeMeetingEndVarianceMinutes(m)).toBe(0)
  })

  it("returns positive number when meeting ran over", () => {
    const m = makeMeeting({ actualMeetingEnd: "2026-08-13T10:15:00.000Z" })
    expect(computeMeetingEndVarianceMinutes(m)).toBe(15)
  })

  it("returns negative number when meeting ended early", () => {
    const m = makeMeeting({ actualMeetingEnd: "2026-08-13T09:45:00.000Z" })
    expect(computeMeetingEndVarianceMinutes(m)).toBe(-15)
  })
})

// ---------------------------------------------------------------------------
// computeExtendedPlannedEnd
// ---------------------------------------------------------------------------

describe("computeExtendedPlannedEnd", () => {
  const plannedEnd = "2026-08-13T10:00:00.000Z"

  it("adds minutes to plannedEnd when currentTime is before plannedEnd", () => {
    const currentTime = new Date("2026-08-13T09:45:00.000Z")
    const result = computeExtendedPlannedEnd(plannedEnd, currentTime, 30)
    expect(result.toISOString()).toBe("2026-08-13T10:30:00.000Z")
  })

  it("adds minutes to currentTime when currentTime is after plannedEnd", () => {
    const currentTime = new Date("2026-08-13T10:20:00.000Z")
    const result = computeExtendedPlannedEnd(plannedEnd, currentTime, 15)
    expect(result.toISOString()).toBe("2026-08-13T10:35:00.000Z")
  })

  it("uses plannedEnd as base when currentTime equals plannedEnd", () => {
    const currentTime = new Date("2026-08-13T10:00:00.000Z")
    const result = computeExtendedPlannedEnd(plannedEnd, currentTime, 30)
    expect(result.toISOString()).toBe("2026-08-13T10:30:00.000Z")
  })
})

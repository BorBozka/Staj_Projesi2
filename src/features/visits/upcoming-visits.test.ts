import { readFileSync } from "node:fs"

import { afterEach, describe, expect, it, vi } from "vitest"

import type { Visit, VisitStatus } from "@/domain/visits"
import { getNonCancelledUpcomingVisits, getUpcomingVisitDayGroups, getUpcomingVisitRelativeTime, getUpcomingVisits } from "@/features/visits/upcoming-visits"

const upcomingVisitsSource = readFileSync(new URL("./UpcomingVisits.tsx", import.meta.url), "utf8")

function visitWithStatus(id: string, plannedStart: string, status: VisitStatus): Visit {
  return {
    id,
    meetingId: `meeting-${id}`,
    creatorEmployeeId: "creator-1",
    visitor: { id: `visitor-${id}`, firstName: "Test", lastName: "Kisi", email: "test@example.com", company: "Test A.Ş." },
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

  it("does not render visit status badges in upcoming visit rows", () => {
    expect(upcomingVisitsSource).not.toContain("VisitStatusBadge")
  })

  it("does not render a calendar icon in upcoming visit rows", () => {
    expect(upcomingVisitsSource).not.toContain("CalendarDays")
    expect(upcomingVisitsSource).toContain("Clock3")
  })

  it("does not render the full date in upcoming visit rows", () => {
    expect(upcomingVisitsSource).not.toContain('formatTr(new Date(visit.plannedStart), "d MMMM EEEE · HH:mm")')
  })

  it("renders different facilities with their prefix", () => {
    expect(upcomingVisitsSource).toContain("Farklı tesis:")
  })
})

describe("getNonCancelledUpcomingVisits", () => {
  it("excludes cancelled visits while preserving planned visits", () => {
    const visits = [
      visitWithStatus("planned", "2026-08-10T12:00:00.000Z", "PLANNED"),
      visitWithStatus("cancelled", "2026-08-10T13:00:00.000Z", "CANCELLED"),
    ]

    expect(getNonCancelledUpcomingVisits(visits).map((visit) => visit.id)).toEqual(["planned"])
  })

  it("returns an empty list when every visit is cancelled", () => {
    const visits = [visitWithStatus("cancelled", "2026-08-10T13:00:00.000Z", "CANCELLED")]

    expect(getNonCancelledUpcomingVisits(visits)).toEqual([])
  })
})

describe("getUpcomingVisitRelativeTime", () => {
  const now = new Date("2026-09-03T10:00:30.000Z")

  it.each([
    ["less than a minute", "2026-09-03T10:01:00.000Z", "0 dk sonra"],
    ["119 minutes", "2026-09-03T11:59:30.000Z", "1 sa 59 dk sonra"],
    ["120 minutes", "2026-09-03T12:00:30.000Z", "2 sa sonra"],
  ])("formats %s within the threshold", (_description, plannedStart, expected) => {
    expect(getUpcomingVisitRelativeTime(plannedStart, now)).toBe(expected)
  })

  it.each([
    ["121 minutes", "2026-09-03T12:01:30.000Z"],
    ["multiple days", "2026-09-06T10:00:30.000Z"],
  ])("returns null for %s beyond the threshold", (_description, plannedStart) => {
    expect(getUpcomingVisitRelativeTime(plannedStart, now)).toBeNull()
  })

  it("returns null for a past start", () => {
    expect(getUpcomingVisitRelativeTime("2026-09-03T09:59:30.000Z", now)).toBeNull()
  })
})

describe("getUpcomingVisitDayGroups", () => {
  const now = new Date("2026-09-03T10:00:00.000Z")

  it("labels today, tomorrow, and later dates while ordering days chronologically", () => {
    const visits = [
      visitWithStatus("later", "2026-09-06T10:00:00.000Z", "PLANNED"),
      visitWithStatus("today", "2026-09-03T11:00:00.000Z", "PLANNED"),
      visitWithStatus("tomorrow", "2026-09-04T11:00:00.000Z", "PLANNED"),
    ]

    expect(getUpcomingVisitDayGroups(visits, now).map((group) => ({ label: group.label, ids: group.visits.map((visit) => visit.id) }))).toEqual([
      { label: "Bugün", ids: ["today"] },
      { label: "Yarın", ids: ["tomorrow"] },
      { label: "6 Eylül Pazar", ids: ["later"] },
    ])
  })

  it("keeps the existing visit order within a single day", () => {
    const visits = [
      visitWithStatus("second", "2026-09-03T12:00:00.000Z", "PLANNED"),
      visitWithStatus("first", "2026-09-03T11:00:00.000Z", "PLANNED"),
    ]

    expect(getUpcomingVisitDayGroups(visits, now)).toMatchObject([{ label: "Bugün", visits: [{ id: "second" }, { id: "first" }] }])
  })
})

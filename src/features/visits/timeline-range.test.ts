import { describe, expect, it } from "vitest"

import type { Visit } from "@/domain/visits"
import { getDayVisitContentLineCount, getDayVisitMinimumHeight, getDayVisitPlacement, getTimelineOffset, getTimelineRange, getTimelineVisitEndMinutes, getTimelineVisitStartMinutes } from "@/features/visits/timeline-range"

function istanbulIsoAt(day: string, hour: number, minute: number) {
  return new Date(`${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+03:00`).toISOString()
}

function visitAt(day: string, hour: number, minute: number, endDay: string, endHour: number, endMinute: number): Visit {
  const plannedStart = istanbulIsoAt(day, hour, minute)
  return {
    id: `${hour}-${minute}`,
    meetingId: `meeting-${hour}-${minute}`,
    creatorEmployeeId: "creator-1",
    visitor: { id: "visitor", firstName: "Test", lastName: "Kisi", email: "test@example.com", company: "Test A.Ş." },
    visitTypeId: "meeting",
    visitTypeName: "Toplanti",
    hostEmployeeId: "maya-kara",
    hostEmployeeName: "Maya Kara",
    hostCompanyId: "bplas",
    hostCompanyName: "BPLAS",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart,
    plannedEnd: istanbulIsoAt(endDay, endHour, endMinute),
    status: "PLANNED",
    invitationStatus: "SENT",
    hasAdditionalRequirements: false,
    createdAt: plannedStart,
    updatedAt: plannedStart,
  }
}

describe("getTimelineRange", () => {
  it("uses the default 08:00–18:00 range when there are no visits", () => {
    expect(getTimelineRange([])).toEqual({ startMinutes: 480, endMinutes: 1080 })
  })

  it("extends the axis for valid visits outside the default range", () => {
    expect(getTimelineRange([visitAt("2026-08-10", 6, 30, "2026-08-10", 20, 15)])).toEqual({ startMinutes: 300, endMinutes: 1320 })
  })

  it("positions midnight and noon at the start and midpoint of a full-day axis", () => {
    const fullDay = { startMinutes: 0, endMinutes: 24 * 60 }
    expect(getTimelineOffset(0, fullDay)).toBe(0)
    expect(getTimelineOffset(12 * 60, fullDay)).toBe(50)
  })

  it("keeps an overnight visit on its start day and positions its end after midnight", () => {
    const visit = visitAt("2026-08-10", 23, 30, "2026-08-11", 0, 30)
    expect(getTimelineVisitStartMinutes(visit)).toBe(23 * 60 + 30)
    expect(getTimelineVisitEndMinutes(visit)).toBe(24 * 60 + 30)
    const range = getTimelineRange([visit])
    expect(range).toEqual({ startMinutes: 8 * 60, endMinutes: 24 * 60 })
    expect(getTimelineOffset(getTimelineVisitStartMinutes(visit), range)).toBe(96.875)
  })
})

describe("getDayVisitPlacement", () => {
  const tenHourRange = { startMinutes: 8 * 60, endMinutes: 18 * 60 }
  const trackHeight = 485
  const pixelsPerMinute = trackHeight / (tenHourRange.endMinutes - tenHourRange.startMinutes)
  const pixelsFor = (startMinutes: number, endMinutes: number) => getDayVisitPlacement(startMinutes, endMinutes, tenHourRange).height / 100 * trackHeight

  it("keeps a one-hour visit at one hour of timeline height", () => {
    expect(pixelsFor(8 * 60, 9 * 60)).toBe(60 * pixelsPerMinute)
  })

  it("does not truncate a two-and-a-half-hour visit", () => {
    expect(pixelsFor(8 * 60 + 35, 11 * 60 + 5)).toBeCloseTo(150 * pixelsPerMinute)
  })

  it("keeps a three-hour visit at three hours of timeline height", () => {
    expect(pixelsFor(7 * 60 + 25, 10 * 60 + 25)).toBe(180 * pixelsPerMinute)
  })

  it("aligns an 08:35 start to its exact timeline offset", () => {
    expect(getDayVisitPlacement(8 * 60 + 35, 11 * 60 + 5, tenHourRange).top / 100 * trackHeight).toBeCloseTo(35 * pixelsPerMinute)
  })

  it("ends a visit at the same offset as its planned end", () => {
    const placement = getDayVisitPlacement(8 * 60 + 35, 11 * 60 + 5, tenHourRange)
    expect(placement.top + placement.height).toBe(getTimelineOffset(11 * 60 + 5, tenHourRange))
  })

  it("preserves the minimum height for short visits and every three-line visit", () => {
    expect(getDayVisitMinimumHeight(15)).toBe(32)
    expect(getDayVisitMinimumHeight(45)).toBe(42)
    expect(getDayVisitMinimumHeight(60)).toBe(54)
    expect(getDayVisitMinimumHeight(90)).toBe(54)
  })
})

describe("getDayVisitContentLineCount", () => {
  it("shows the visitor company only when all four content lines fit", () => {
    expect(getDayVisitContentLineCount(55)).toBe(4)
    expect(getDayVisitContentLineCount(54.99)).toBe(3)
  })

  it("keeps the name, time, and type when the measured content area fits them completely", () => {
    expect(getDayVisitContentLineCount(42)).toBe(3)
  })

  it("keeps only name and time when the type line would not fit", () => {
    expect(getDayVisitContentLineCount(29)).toBe(2)
    expect(getDayVisitContentLineCount(41.99)).toBe(2)
  })

  it("keeps only the name when the time line would not fit", () => {
    expect(getDayVisitContentLineCount(16)).toBe(1)
    expect(getDayVisitContentLineCount(28.99)).toBe(1)
  })

  it("makes the same line-count decision for equal card heights", () => {
    expect(getDayVisitContentLineCount(33)).toBe(getDayVisitContentLineCount(33))
  })
})

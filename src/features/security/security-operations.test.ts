import { describe, expect, it } from "vitest"

import type { Visit, VisitStatus } from "@/domain/visits"
import {
  filterSecurityVisitRows,
  filterSecurityCardIssues,
  getExpectedSecurityVisits,
  getInsideSecurityVisits,
  getSecurityOperationView,
  getSecurityOperationViewParams,
} from "./security-operations"

function makeVisit(id: string, status: VisitStatus, plannedStart: string, overrides: Partial<Visit> = {}): Visit {
  return {
    id,
    meetingId: `meeting-${id}`,
    creatorEmployeeId: "creator-1",
    visitor: { id: `visitor-${id}`, firstName: id, lastName: "Ziyaretçi", email: `${id}@example.com`, company: "Örnek Firma" },
    visitTypeId: "meeting",
    visitTypeName: "Toplantı",
    hostEmployeeId: "host-1",
    hostEmployeeName: "İpek Işık",
    hostCompanyId: "bplas",
    hostCompanyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart,
    plannedEnd: "2026-08-28T13:00:00+03:00",
    status,
    invitationStatus: "SENT",
    hasAdditionalRequirements: false,
    createdAt: plannedStart,
    updatedAt: plannedStart,
    ...overrides,
  }
}

describe("security expected visits", () => {
  const now = new Date("2026-08-28T12:00:00+03:00")

  it("keeps only today's planned visits and excludes every other operational status", () => {
    const visits = [
      makeVisit("Planlı", "PLANNED", "2026-08-28T12:30:00+03:00"),
      makeVisit("Dün", "PLANNED", "2026-08-27T12:30:00+03:00"),
      makeVisit("İçeride", "CHECKED_IN", "2026-08-28T10:00:00+03:00"),
      makeVisit("Çıktı", "CHECKED_OUT", "2026-08-28T09:00:00+03:00"),
      makeVisit("İptal", "CANCELLED", "2026-08-28T14:00:00+03:00"),
    ]

    expect(getExpectedSecurityVisits(visits, now).map(({ visit }) => visit.id)).toEqual(["Planlı"])
  })

  it("marks delayed visits, places them first, then sorts upcoming visits by start time", () => {
    const visits = [
      makeVisit("Sonra", "PLANNED", "2026-08-28T15:00:00+03:00"),
      makeVisit("Geciken", "PLANNED", "2026-08-28T10:30:00+03:00"),
      makeVisit("Yaklaşan", "PLANNED", "2026-08-28T12:30:00+03:00"),
    ]

    const rows = getExpectedSecurityVisits(visits, now)
    expect(rows.map(({ visit }) => visit.id)).toEqual(["Geciken", "Yaklaşan", "Sonra"])
    expect(rows[0]).toMatchObject({ isDelayed: true, delayMinutes: 90 })
    expect(rows[1].isDelayed).toBe(false)
  })
})

describe("security inside visits", () => {
  const now = new Date("2026-08-28T12:00:00+03:00")

  it("keeps only checked-in visits and orders overdue records by greatest delay", () => {
    const visits = [
      makeVisit("Normal", "CHECKED_IN", "2026-08-28T11:00:00+03:00", { plannedEnd: "2026-08-28T13:00:00+03:00", actualCheckIn: "2026-08-28T11:05:00+03:00" }),
      makeVisit("Az aştı", "CHECKED_IN", "2026-08-28T10:00:00+03:00", { plannedEnd: "2026-08-28T11:45:00+03:00" }),
      makeVisit("Çok aştı", "CHECKED_IN", "2026-08-28T09:00:00+03:00", { plannedEnd: "2026-08-28T10:30:00+03:00" }),
      makeVisit("Planlı", "PLANNED", "2026-08-28T12:30:00+03:00"),
      makeVisit("Çıktı", "CHECKED_OUT", "2026-08-28T09:00:00+03:00"),
    ]

    const rows = getInsideSecurityVisits(visits, now)
    expect(rows.map(({ visit }) => visit.id)).toEqual(["Çok aştı", "Az aştı", "Normal"])
    expect(rows[0]).toMatchObject({ isDelayed: true, delayMinutes: 90 })
    expect(rows[2].isDelayed).toBe(false)
  })
})

describe("security operations search", () => {
  const rows = getExpectedSecurityVisits([
    makeVisit("Ayça", "PLANNED", "2026-08-28T12:30:00+03:00", { visitor: { id: "visitor-1", firstName: "Ayça", lastName: "Yılmaz", email: "ayca@example.com", company: "İzmir Lojistik" }, hostEmployeeName: "İpek Işık" }),
  ], new Date("2026-08-28T12:00:00+03:00"))

  it.each([
    ["visitor full name", "AYÇA YILMAZ"],
    ["company", "izmir lojistik"],
    ["host", "İPEK IŞIK"],
  ])("matches %s with Turkish-aware case-insensitive behavior", (_label, query) => {
    expect(filterSecurityVisitRows(rows, query)).toHaveLength(1)
  })

  it("returns no records for an unrelated search", () => {
    expect(filterSecurityVisitRows(rows, "eşleşmeyen")).toEqual([])
  })
})

describe("security card issue search", () => {
  const issue = {
    card: { id: "card-1", cardNumber: "007", status: "NOT_RETURNED" as const, assignedVisitId: "Ayça" },
    visit: makeVisit("Ayça", "CHECKED_OUT", "2026-08-28T09:00:00+03:00", {
      actualCheckOut: "2026-08-28T10:00:00+03:00",
      visitorCardReturned: false,
      visitorCardId: "card-1",
      visitorCardNumber: "007",
      visitor: { id: "visitor-1", firstName: "Ayça", lastName: "Yılmaz", email: "ayca@example.com", company: "İzmir Lojistik" },
    }),
  }

  it.each(["007", "AYÇA YILMAZ", "izmir lojistik"])("matches an operational issue by %s", (query) => {
    expect(filterSecurityCardIssues([issue], query)).toEqual([issue])
  })
})

describe("security operations URL view state", () => {
  it.each([
    ["", "expected"],
    ["view=expected", "expected"],
    ["view=inside", "inside"],
    ["view=cards", "cards"],
    ["view=unknown", "expected"],
  ] as const)("maps %s to %s", (query, expected) => {
    expect(getSecurityOperationView(new URLSearchParams(query))).toBe(expected)
  })

  it("updates view while preserving unrelated search parameters", () => {
    const params = getSecurityOperationViewParams(new URLSearchParams("q=ipek&view=expected"), "inside")
    expect(params.toString()).toBe("q=ipek&view=inside")
  })
})

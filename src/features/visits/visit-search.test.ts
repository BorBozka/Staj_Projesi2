import { describe, expect, it } from "vitest"

import type { Visit } from "@/domain/visits"
import { matchesVisitQuery, searchVisits } from "@/features/visits/visit-search"

function makeVisit(id: string, overrides: Partial<Visit> = {}): Visit {
  return {
    id,
    meetingId: `meeting-${id}`,
    creatorEmployeeId: "creator-1",
    visitor: { id: `visitor-${id}`, firstName: "Elif", lastName: "Köksal", email: "elif@example.com", company: "Örnek Firma" },
    visitTypeId: "meeting",
    visitTypeName: "Toplantı",
    hostEmployeeId: "host-1",
    hostEmployeeName: "İpek Işık",
    hostCompanyId: "bplas",
    hostCompanyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: "2026-09-02T12:00:00+03:00",
    plannedEnd: "2026-09-02T13:00:00+03:00",
    status: "PLANNED",
    invitationStatus: "NOT_SENT",
    hasAdditionalRequirements: false,
    createdAt: "2026-08-28T09:00:00+03:00",
    updatedAt: "2026-08-28T09:00:00+03:00",
    ...overrides,
  }
}

const now = new Date("2026-09-02T16:00:00+03:00")

describe("matchesVisitQuery", () => {
  it("matches on visitor first name, last name and full name", () => {
    const visit = makeVisit("a")
    expect(matchesVisitQuery(visit, "elif")).toBe(true)
    expect(matchesVisitQuery(visit, "köksal")).toBe(true)
    expect(matchesVisitQuery(visit, "Elif Köksal")).toBe(true)
  })

  it("matches on visitor company, facility, visit type and host", () => {
    const visit = makeVisit("a")
    expect(matchesVisitQuery(visit, "örnek")).toBe(true)
    expect(matchesVisitQuery(visit, "merkez")).toBe(true)
    expect(matchesVisitQuery(visit, "toplantı")).toBe(true)
    expect(matchesVisitQuery(visit, "İpek")).toBe(true)
  })

  it("folds case using Turkish rules so dotted and dotless I still match", () => {
    const visit = makeVisit("a", { facilityName: "İstanbul Tesisi" })
    expect(matchesVisitQuery(visit, "istanbul")).toBe(true)
    expect(matchesVisitQuery(makeVisit("b", { visitor: { id: "v", firstName: "Işıl", lastName: "Kaya", company: "X" } }), "ışıl")).toBe(true)
  })

  it("ignores the note field so free text cannot flood results", () => {
    expect(matchesVisitQuery(makeVisit("a", { note: "kargo teslimatı" }), "kargo")).toBe(false)
  })

  it("treats a blank query as no match", () => {
    expect(matchesVisitQuery(makeVisit("a"), "   ")).toBe(false)
  })
})

describe("searchVisits", () => {
  it("returns nothing for a blank query", () => {
    expect(searchVisits([makeVisit("a")], "  ", now)).toEqual([])
  })

  it("searches past visits too, not just upcoming ones", () => {
    const past = makeVisit("past", { plannedStart: "2026-08-01T10:00:00+03:00", plannedEnd: "2026-08-01T11:00:00+03:00", status: "CHECKED_OUT" })
    expect(searchVisits([past], "elif", now).map((visit) => visit.id)).toEqual(["past"])
  })

  it("orders hits by how close they are to now, in either direction", () => {
    const farFuture = makeVisit("far-future", { plannedStart: "2026-12-01T10:00:00+03:00", plannedEnd: "2026-12-01T11:00:00+03:00" })
    const justPast = makeVisit("just-past", { plannedStart: "2026-09-02T15:00:00+03:00", plannedEnd: "2026-09-02T15:30:00+03:00" })
    const soon = makeVisit("soon", { plannedStart: "2026-09-02T16:30:00+03:00", plannedEnd: "2026-09-02T17:00:00+03:00" })
    expect(searchVisits([farFuture, justPast, soon], "elif", now).map((visit) => visit.id)).toEqual(["soon", "just-past", "far-future"])
  })

  it("filters out visits that do not match", () => {
    const other = makeVisit("other", { visitor: { id: "v2", firstName: "Kaan", lastName: "Balcı", company: "Diğer" } })
    expect(searchVisits([makeVisit("a"), other], "kaan", now).map((visit) => visit.id)).toEqual(["other"])
  })
})

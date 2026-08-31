import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import type { Visit } from "@/domain/visits"
import { ExpectedRow, InsideRow } from "@/features/security/SecurityOperationsPage"
import type { SecurityVisitRow } from "@/features/security/security-operations"

function makeVisit(overrides: Partial<Visit> = {}): Visit {
  return {
    id: "visit-1",
    meetingId: "meeting-1",
    creatorEmployeeId: "creator-1",
    visitor: { id: "visitor-1", firstName: "Deniz", lastName: "Aksoy", email: "deniz@example.com", company: "Kuzey Hat Tedarik A.Ş." },
    visitTypeId: "meeting",
    visitTypeName: "Toplantı",
    hostEmployeeId: "host-1",
    hostEmployeeName: "Emre Yılmaz",
    hostCompanyId: "bplas",
    hostCompanyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: "2026-08-28T09:30:00+03:00",
    plannedEnd: "2026-08-28T11:00:00+03:00",
    status: "PLANNED",
    invitationStatus: "SENT",
    hasAdditionalRequirements: false,
    createdAt: "2026-08-28T08:00:00+03:00",
    updatedAt: "2026-08-28T08:00:00+03:00",
    ...overrides,
  }
}

function row(overrides: Partial<SecurityVisitRow> = {}): SecurityVisitRow {
  return { visit: makeVisit(), isDelayed: false, delayMinutes: 0, ...overrides }
}

describe("ExpectedRow", () => {
  it("is a keyboard-accessible control that shows time, name, company and host as distinct facts", () => {
    const markup = renderToStaticMarkup(<ExpectedRow row={row()} onOpenDetail={vi.fn()} onCheckIn={vi.fn()} />)
    expect(markup).toContain('role="button"')
    expect(markup).toContain('tabindex="0"')
    expect(markup).toContain("09:30")
    expect(markup).toContain("Deniz Aksoy")
    expect(markup).toContain("Kuzey Hat Tedarik A.Ş.")
    expect(markup).toContain("Emre Yılmaz")
    expect(markup).toContain("•")
    expect(markup).toContain("Giriş yap")
  })

  it("keeps a consistent minimum row height regardless of record count", () => {
    expect(renderToStaticMarkup(<ExpectedRow row={row()} onOpenDetail={vi.fn()} onCheckIn={vi.fn()} />)).toContain("min-h-[4.75rem]")
  })

  it("renders the delay as a human-readable duration for a late expected visit", () => {
    expect(renderToStaticMarkup(<ExpectedRow row={row({ isDelayed: true, delayMinutes: 18 })} onOpenDetail={vi.fn()} onCheckIn={vi.fn()} />)).toContain("18 dk gecikti")
    expect(renderToStaticMarkup(<ExpectedRow row={row({ isDelayed: true, delayMinutes: 295 })} onOpenDetail={vi.fn()} onCheckIn={vi.fn()} />)).toContain("4 sa 55 dk gecikti")
  })

  it("shows no delay text when the visit is on time", () => {
    const markup = renderToStaticMarkup(<ExpectedRow row={row()} onOpenDetail={vi.fn()} onCheckIn={vi.fn()} />)
    expect(markup).not.toContain("gecikti")
    expect(markup).not.toContain(" dk")
  })
})

describe("InsideRow", () => {
  const insideVisit = (overrides: Partial<Visit> = {}) => makeVisit({ status: "CHECKED_IN", actualCheckIn: "2026-08-28T11:11:00+03:00", visitorCardNumber: "002", ...overrides })

  it("always shows the visitor, the check-in time, the card number, checkout and an overflow icon-button", () => {
    const markup = renderToStaticMarkup(<InsideRow row={row({ visit: insideVisit() })} onOpenDetail={vi.fn()} onCheckOut={vi.fn()} onEdit={vi.fn()} />)
    expect(markup).toContain("Deniz Aksoy")
    expect(markup).toContain("11:11 giriş")
    expect(markup).toContain("Kart 002")
    expect(markup).toContain("Çıkış yap")
    expect(markup).toContain('aria-label="Ziyaret işlemleri"')
    expect(markup).toContain('title="Ziyaret işlemleri"')
    expect(markup).toContain("min-h-[4.75rem]")
  })

  it("does not repeat company, host or an 'İçeride' status pill on the row", () => {
    const markup = renderToStaticMarkup(<InsideRow row={row({ visit: insideVisit() })} onOpenDetail={vi.fn()} onCheckOut={vi.fn()} onEdit={vi.fn()} />)
    expect(markup).not.toContain("İçeride")
    expect(markup).not.toContain("Kuzey Hat Tedarik A.Ş.")
    expect(markup).not.toContain("Emre Yılmaz")
  })

  it("shows a human-readable overrun for an overdue inside visit and nothing when within time", () => {
    const overdue = renderToStaticMarkup(<InsideRow row={row({ visit: insideVisit(), isDelayed: true, delayMinutes: 72 })} onOpenDetail={vi.fn()} onCheckOut={vi.fn()} onEdit={vi.fn()} />)
    expect(overdue).toContain("1 sa 12 dk süre aştı")
    const onTime = renderToStaticMarkup(<InsideRow row={row({ visit: insideVisit() })} onOpenDetail={vi.fn()} onCheckOut={vi.fn()} onEdit={vi.fn()} />)
    expect(onTime).not.toContain("süre aştı")
  })
})

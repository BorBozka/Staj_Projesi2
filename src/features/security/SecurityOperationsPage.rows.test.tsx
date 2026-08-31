import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import type { Visit } from "@/domain/visits"
import { ExpectedRow, InsideRow } from "@/features/security/SecurityOperationsPage"
import { formatDelayLabel, type SecurityVisitRow } from "@/features/security/security-operations"

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

describe("formatDelayLabel", () => {
  it("appends the minute count only for a positive whole number", () => {
    expect(formatDelayLabel("Gecikti", 18)).toBe("Gecikti · 18 dk")
    expect(formatDelayLabel("Süre aştı", 25)).toBe("Süre aştı · 25 dk")
  })

  it("falls back to the bare label for zero or negative input", () => {
    expect(formatDelayLabel("Gecikti", 0)).toBe("Gecikti")
    expect(formatDelayLabel("Süre aştı", -4)).toBe("Süre aştı")
  })
})

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

  it("keeps a fixed row height regardless of record count", () => {
    expect(renderToStaticMarkup(<ExpectedRow row={row()} onOpenDetail={vi.fn()} onCheckIn={vi.fn()} />)).toContain("h-14")
  })

  it("shows the delay in minutes for a late expected visit", () => {
    const markup = renderToStaticMarkup(<ExpectedRow row={row({ isDelayed: true, delayMinutes: 18 })} onOpenDetail={vi.fn()} onCheckIn={vi.fn()} />)
    expect(markup).toContain("Gecikti · 18 dk")
  })

  it("shows no delay pill and no minute text when the visit is on time", () => {
    const markup = renderToStaticMarkup(<ExpectedRow row={row()} onOpenDetail={vi.fn()} onCheckIn={vi.fn()} />)
    expect(markup).not.toContain("Gecikti")
    expect(markup).not.toContain(" dk")
  })
})

describe("InsideRow", () => {
  it("stays minimal: visitor name, checkout and an overflow icon-button only", () => {
    const markup = renderToStaticMarkup(<InsideRow row={row({ visit: makeVisit({ status: "CHECKED_IN" }) })} onOpenDetail={vi.fn()} onCheckOut={vi.fn()} onEdit={vi.fn()} />)
    expect(markup).toContain("Deniz Aksoy")
    expect(markup).toContain("Çıkış yap")
    expect(markup).toContain('aria-label="Ziyaret işlemleri"')
    expect(markup).toContain('title="Ziyaret işlemleri"')
    expect(markup).toContain("h-11")
  })

  it("does not repeat company, host or an 'İçeride' status pill on the row", () => {
    const markup = renderToStaticMarkup(<InsideRow row={row({ visit: makeVisit({ status: "CHECKED_IN" }) })} onOpenDetail={vi.fn()} onCheckOut={vi.fn()} onEdit={vi.fn()} />)
    expect(markup).not.toContain("İçeride")
    expect(markup).not.toContain("Kuzey Hat Tedarik A.Ş.")
    expect(markup).not.toContain("Emre Yılmaz")
  })

  it("shows 'Süre aştı · N dk' for an overdue inside visit and nothing when within time", () => {
    const overdue = renderToStaticMarkup(<InsideRow row={row({ isDelayed: true, delayMinutes: 25 })} onOpenDetail={vi.fn()} onCheckOut={vi.fn()} onEdit={vi.fn()} />)
    expect(overdue).toContain("Süre aştı · 25 dk")
    const onTime = renderToStaticMarkup(<InsideRow row={row()} onOpenDetail={vi.fn()} onCheckOut={vi.fn()} onEdit={vi.fn()} />)
    expect(onTime).not.toContain("Süre aştı")
  })
})

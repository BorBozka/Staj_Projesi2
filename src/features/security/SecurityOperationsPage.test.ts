import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const pageSource = readFileSync(resolve(process.cwd(), "src/features/security/SecurityOperationsPage.tsx"), "utf8")

describe("SecurityOperationsPage contract", () => {
  it("drops the old tab / view-state infrastructure entirely", () => {
    expect(pageSource).not.toContain("useSearchParams")
    expect(pageSource).not.toContain('role="tab"')
    expect(pageSource).not.toContain('role="tablist"')
    expect(pageSource).not.toContain('role="tabpanel"')
    expect(pageSource).not.toContain("view=")
    expect(pageSource).not.toContain("getSecurityOperationView")
    expect(pageSource).not.toContain("Kart sorunları")
  })

  it("renders the expected and inside lists together in two side-by-side panels", () => {
    expect(pageSource).toContain('title="Beklenenler"')
    expect(pageSource).toContain('title="İçeride"')
    expect(pageSource).toContain("lg:grid-cols-2")
    expect(pageSource).toContain("getExpectedSecurityVisits")
    expect(pageSource).toContain("getInsideSecurityVisits")
  })

  it("keeps the page fixed while each panel manages its own overflow", () => {
    expect(pageSource).toContain('className="flex h-full min-h-0 flex-col gap-3 overflow-hidden"')
    expect(pageSource).toContain('className="min-h-0 flex-1 overflow-auto scrollbar-thin"')
  })

  it("filters both panels from the single search box", () => {
    expect(pageSource).toContain("filterSecurityVisitRows(getExpectedSecurityVisits(scopedVisits, now), search)")
    expect(pageSource).toContain("filterSecurityVisitRows(getInsideSecurityVisits(scopedVisits, now), search)")
  })

  it("uses a facility icon, not a clock, for the company/facility context box", () => {
    expect(pageSource).toContain("Building2")
    expect(pageSource).not.toContain("Clock3")
  })

  it("gates the pending-card-returns action on an unresolved count and never exposes LOST", () => {
    expect(pageSource).toContain("securityService.getUnreturnedVisitorCardIssues()")
    expect(pageSource).toContain("scopedCardIssues.length > 0")
    expect(pageSource).toContain("İade bekleyen kartlar · {scopedCardIssues.length}")
    expect(pageSource).toContain("securityService.receiveReturnedVisitorCard(visitId)")
    expect(pageSource).not.toContain("Kayıp olarak işaretle")
    expect(pageSource).not.toContain("LOST")
  })

  it("keeps unplanned visits gated and stays off Manager/Admin UI", () => {
    expect(pageSource).toContain("+ Plansız ziyaret")
    expect(pageSource).toContain("disabled aria-describedby")
    expect(pageSource).not.toContain('from "@/features/manager/')
    expect(pageSource).not.toContain("adminService")
  })

  it("no longer opens a row detail dialog: rows are plain, non-interactive containers", () => {
    expect(pageSource).not.toContain("SecurityVisitDetailDialog")
    expect(pageSource).not.toContain("onOpenDetail")
    expect(pageSource).not.toContain("detailVisit")
    expect(pageSource).not.toContain('role="button"')
    expect(pageSource).not.toContain("RowShell")
  })

  it("wires check-in and checkout through SecurityService dialogs", () => {
    expect(pageSource).toContain('from "@/features/security/SecurityCheckInDialog"')
    expect(pageSource).toContain('from "@/features/security/SecurityCheckOutDialog"')
    expect(pageSource).toContain("Giriş yap")
    expect(pageSource).toContain("Çıkış yap")
  })

  it("keeps the İçeride panel free of the row overflow menu and the in-page correction dialog", () => {
    expect(pageSource).not.toContain("DropdownMenu")
    expect(pageSource).not.toContain("MoreHorizontal")
    expect(pageSource).not.toContain("Bilgileri düzelt")
    expect(pageSource).not.toContain("SecurityVisitorCorrectionDialog")
    expect(pageSource).not.toContain("correctingVisit")
    expect(pageSource).not.toContain("onEdit")
  })

  it("renders the İçeride row as a two-line block: name + pill, then company·host and the visit times", () => {
    // Line 1: name + "Süre aştı" pill (same placement as ExpectedRow's "Gecikti").
    // Line 2: "{company} · {host}" (truncates) on the left, "Giriş {check-in} · Bek. çıkış
    // {planned end}" (never truncates) on the right. No card number on the row.
    expect(pageSource).toContain('<span className="min-w-0 flex-1 truncate text-slate-500">{visit.visitor.company} · {visit.hostEmployeeName}</span>')
    expect(pageSource).toContain('Giriş {checkInLabel} · Bek. çıkış {formatVisitTime(visit.plannedEnd)}')
    expect(pageSource).toContain('visit.actualCheckIn ? formatVisitTime(visit.actualCheckIn) : "—"')
    expect(pageSource).not.toContain("visitorCardNumber")
    expect(pageSource).not.toContain("cardLabel")
    expect(pageSource).not.toContain("#{")
  })
})

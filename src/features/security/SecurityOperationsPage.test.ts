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
    expect(pageSource).toContain("lg:grid-cols-[3fr_2fr]")
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

  it("opens a read-only detail dialog from the row body without letting row actions trigger it", () => {
    expect(pageSource).toContain('from "@/features/security/SecurityVisitDetailDialog"')
    expect(pageSource).toContain("onClick={onOpenDetail}")
    expect(pageSource).toContain("event.stopPropagation()")
  })

  it("wires check-in, checkout, and visitor correction through SecurityService dialogs", () => {
    expect(pageSource).toContain('from "@/features/security/SecurityCheckInDialog"')
    expect(pageSource).toContain('from "@/features/security/SecurityCheckOutDialog"')
    expect(pageSource).toContain('from "@/features/security/SecurityVisitorCorrectionDialog"')
    expect(pageSource).toContain("Giriş yap")
    expect(pageSource).toContain("Çıkış yap")
    expect(pageSource).toContain("Bilgileri düzelt")
  })
})

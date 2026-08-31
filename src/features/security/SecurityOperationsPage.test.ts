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

  it("wraps both lists in one shared operation workspace container", () => {
    expect(pageSource).toContain('title="Beklenenler"')
    expect(pageSource).toContain('title="İçeride"')
    expect(pageSource).toContain('className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-white shadow-panel lg:flex-row"')
    expect(pageSource).toContain("getExpectedSecurityVisits")
    expect(pageSource).toContain("getInsideSecurityVisits")
  })

  it("splits the workspace roughly 60/40 on desktop and stacks (expected first) when narrow", () => {
    const expectedPanel = pageSource.indexOf('title="Beklenenler"')
    const insidePanel = pageSource.indexOf('title="İçeride"')
    expect(expectedPanel).toBeGreaterThan(-1)
    expect(insidePanel).toBeGreaterThan(expectedPanel)
    expect(pageSource).toContain("lg:flex-none lg:basis-3/5 lg:border-b-0 lg:border-r")
    expect(pageSource).toContain("lg:flex-none lg:basis-2/5")
  })

  it("gives each panel an independent header, scroll area, and empty state", () => {
    expect(pageSource).toContain('className="min-h-0 flex-1 overflow-auto scrollbar-thin"')
    expect(pageSource).toContain('"Bugün beklenen ziyaret yok."')
    expect(pageSource).toContain('"İçeride ziyaretçi yok."')
    expect(pageSource).toContain('"Aramayla eşleşen kayıt yok."')
    // Count sits in a neutral badge, not glued to the title text.
    expect(pageSource).not.toContain("· {count}")
    expect(pageSource).toContain("rounded-full bg-slate-200/70")
  })

  it("keeps the page itself fixed while the workspace manages overflow", () => {
    expect(pageSource).toContain('className="flex h-full min-h-0 flex-col gap-3 overflow-hidden"')
  })

  it("filters both panels from the single search box", () => {
    expect(pageSource).toContain("filterSecurityVisitRows(getExpectedSecurityVisits(scopedVisits, now), search)")
    expect(pageSource).toContain("filterSecurityVisitRows(getInsideSecurityVisits(scopedVisits, now), search)")
  })

  it("caps the toolbar search width so it cannot swallow the toolbar", () => {
    expect(pageSource).toContain("lg:max-w-xs lg:flex-1")
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
    expect(pageSource).toContain('role="button"')
    expect(pageSource).toContain('event.key === "Enter" || event.key === " "')
  })

  it("renders the inside overflow control as a real icon-button below the primary checkout action", () => {
    expect(pageSource).toContain("MoreHorizontal")
    expect(pageSource).toContain('size="icon-sm" variant="ghost"')
    expect(pageSource).toContain('aria-label="Ziyaret işlemleri" title="Ziyaret işlemleri"')
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

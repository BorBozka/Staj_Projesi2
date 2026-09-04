import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const shellSource = readFileSync(resolve(process.cwd(), "src/components/app-shell/SecurityShell.tsx"), "utf8")
const headerClockSource = readFileSync(resolve(process.cwd(), "src/components/app-shell/HeaderClock.tsx"), "utf8")

describe("SecurityShell header", () => {
  it("keeps its shared-shell title independent from the Employee workspace", () => {
    expect(shellSource).toContain('title="Güvenlik"')
    expect(shellSource).not.toContain("Ziyaretlerim")
  })

  it("renders through the shared sidebar-less shell with no collapse or drawer state", () => {
    expect(shellSource).toContain("FocusedShell")
    expect(shellSource).toContain("useAuth")
    expect(shellSource).toContain("toAccountProfile(currentUser)")
    expect(shellSource).not.toContain("security-navigation-collapsed")
    expect(shellSource).not.toContain("sessionStorage")
    expect(shellSource).not.toContain("collapsed")
    expect(shellSource).not.toContain("<aside")
    expect(shellSource).not.toContain("security-mobile-navigation")
    expect(shellSource).not.toContain("Menu")
  })

  it("keeps a second-updating clock centered in the compact Security header", () => {
    expect(shellSource).toContain("headerHeight={64}")
    expect(shellSource).toContain("headerNavigation={<SecurityNavigation />}")
    expect(shellSource).toContain("headerCenter={<HeaderClock />}")
    expect(shellSource).not.toContain("topBand")
    // The clock is the shared HeaderClock component, rendered exactly once here.
    expect(shellSource.match(/<HeaderClock \/>/g)).toHaveLength(1)
    expect(shellSource).not.toContain("function SecurityClock")
    expect(shellSource).not.toContain("setInterval")
    expect(headerClockSource).toContain("window.setInterval(() => setNow(new Date()), 1_000)")
    expect(headerClockSource).toContain("window.clearInterval(intervalId)")
    expect(headerClockSource).toContain('hour: "2-digit", minute: "2-digit", second: "2-digit"')
    expect(headerClockSource).toContain('weekday: "long"')
    expect(headerClockSource).toContain("tabular-nums")
    expect(headerClockSource).toContain("text-[38px]")
    expect(headerClockSource).toContain("text-[11px]")
  })

  it("keeps the compact Security navigation beside the title", () => {
    expect(shellSource).toContain('aria-label="Güvenlik menüsü"')
    expect(shellSource).toContain('{ label: "Operasyon", to: "/security/operations" }')
    expect(shellSource).toContain('{ label: "Mal Hareketleri", to: "/security/goods-movements" }')
    expect(shellSource).toContain('aria-current={pathname === to ? "page" : undefined}')
  })
})

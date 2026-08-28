import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const shellSource = readFileSync(resolve(process.cwd(), "src/components/app-shell/SecurityShell.tsx"), "utf8")

describe("SecurityShell navigation", () => {
  it("contains only the Security operation modules", () => {
    expect(shellSource).toContain('{ label: "Operasyon"')
    expect(shellSource).toContain('{ label: "Mal Hareketleri"')
    expect(shellSource).toContain('aria-label="Güvenlik menüsü"')
    expect(shellSource).not.toContain('label: "Dashboard"')
    expect(shellSource).not.toContain('label: "Tüm Ziyaretler"')
    expect(shellSource).not.toContain('label: "Kaynaklar"')
    expect(shellSource).not.toContain('label: "Araç planı"')
    expect(shellSource).not.toContain('label: "Raporlar"')
    expect(shellSource).not.toContain('label: "Kullanıcılar"')
    expect(shellSource).not.toContain('label: "Organizasyon"')
    expect(shellSource).not.toContain('label: "Sistem Ayarları"')
    expect(shellSource).not.toContain('label: "Ziyaretlerim"')
    expect(shellSource).not.toContain("ManagerNotifications")
  })

  it("drops the redundant single-group navigation label now that there are only two modules", () => {
    expect(shellSource).not.toContain("Günlük operasyon")
  })

  it("keeps a Security-specific collapsed state and profile role", () => {
    expect(shellSource).toContain('"security-navigation-collapsed"')
    expect(shellSource).toContain("window.sessionStorage.setItem")
    expect(shellSource).toContain(">Güvenlik</p>")
    expect(shellSource).not.toContain("style={{ zoom")
  })

  it("provides semantic desktop and mobile navigation", () => {
    expect(shellSource).toContain('aria-current={pathname === to ? "page" : undefined}')
    expect(shellSource).toContain('aria-label="Mobil güvenlik menüsü"')
    expect(shellSource).toContain('id="security-mobile-navigation"')
  })
})

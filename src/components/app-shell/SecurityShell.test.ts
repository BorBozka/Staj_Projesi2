import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const shellSource = readFileSync(resolve(process.cwd(), "src/components/app-shell/SecurityShell.tsx"), "utf8")

describe("SecurityShell navigation", () => {
  it("exposes only the two Security operation modules as top navigation", () => {
    expect(shellSource).toContain('{ label: "Operasyon", to: "/security/operations" }')
    expect(shellSource).toContain('{ label: "Mal Hareketleri", to: "/security/goods-movements" }')
    expect(shellSource).toContain('aria-label="Güvenlik menüsü"')
    expect(shellSource).not.toContain('label: "Dashboard"')
    expect(shellSource).not.toContain('label: "Tüm Ziyaretler"')
    expect(shellSource).not.toContain('label: "Kaynaklar"')
    expect(shellSource).not.toContain('label: "Raporlar"')
    expect(shellSource).not.toContain('label: "Kullanıcılar"')
    expect(shellSource).not.toContain('label: "Sistem Ayarları"')
    expect(shellSource).not.toContain('label: "Ziyaretlerim"')
  })

  it("renders through the shared sidebar-less shell with no collapse or drawer state", () => {
    expect(shellSource).toContain("FocusedShell")
    expect(shellSource).not.toContain("security-navigation-collapsed")
    expect(shellSource).not.toContain("sessionStorage")
    expect(shellSource).not.toContain("collapsed")
    expect(shellSource).not.toContain("<aside")
    expect(shellSource).not.toContain("security-mobile-navigation")
    expect(shellSource).not.toContain("Menu")
  })

  it("marks the active route with native semantics", () => {
    expect(shellSource).toContain('aria-current={pathname === to ? "page" : undefined}')
    expect(shellSource).toContain("NavLink")
    expect(shellSource).toContain("border-blue-600")
  })
})

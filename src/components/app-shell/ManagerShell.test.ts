import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const componentSource = readFileSync(resolve(process.cwd(), "src/components/app-shell/ManagerShell.tsx"), "utf8")

describe("ManagerNotifications", () => {
  it("keeps dismissal local while rendering clear status and actions", () => {
    expect(componentSource).toContain("Tümünü temizle")
    expect(componentSource).not.toContain("Eylem bekleyenler")
    expect(componentSource).toContain("Bildirimler</DropdownMenuLabel>")
    expect(componentSource).toContain("InvitationNotificationStatus")
    expect(componentSource).toContain("Gönderim başarısız")
    expect(componentSource).toContain("Davet gönderilmedi")
    expect(componentSource).toContain("Gönderiliyor…")
    expect(componentSource).toContain('visit.invitationStatus !== "SENDING"')
    expect(componentSource).toContain("Yeniden gönder")
    expect(componentSource).toContain("max-h-[min(28rem,calc(100vh-7rem))]")
    expect(componentSource).toContain("setDismissedVisitIds")
    expect(componentSource).not.toContain("Bildirimleri temizle")
  })
})

describe("Manager sidebar transition", () => {
  it("keeps labels mounted and aligns the sidebar and content transitions", () => {
    expect(componentSource).toContain("transition-[padding-left] duration-300")
    expect(componentSource).toContain("transition-[width] duration-300")
    expect(componentSource).toContain("cubic-bezier(0.4,0,0.2,1)")
    expect(componentSource).toContain("transition-[opacity,transform] duration-150")
    expect(componentSource).not.toContain("{!collapsed && <span className=\"truncate\">{itemLabel}</span>}")
  })

  it("keeps the collapse control visible and the desktop navigation unscrollable", () => {
    expect(componentSource).toContain("onClick={() => onCollapsedChange(!collapsed)}")
    expect(componentSource).not.toContain("ChevronLeft")
    expect(componentSource).not.toContain("ChevronRight")
    expect(componentSource).toContain('className="flex min-h-0 flex-1 cursor-pointer flex-col overflow-hidden px-2 py-1"')
    expect(componentSource).not.toContain("overflow-x-hidden overflow-y-auto px-2 py-1.5")
    expect(componentSource).not.toContain("mt-2 flex-1 cursor-pointer")
  })
})

describe("Role-aware navigation", () => {
  it("uses one shell and exposes system management only to the Admin role", () => {
    expect(componentSource).toContain('role === "ADMIN"')
    expect(componentSource).toContain('label="Sistem Yönetimi"')
    expect(componentSource).toContain('label: "Kullanıcılar"')
    expect(componentSource).toContain('label: "Organizasyon"')
    expect(componentSource).toContain('label: "Sistem Ayarları"')
    expect(componentSource).toContain('basePath = isAdmin ? "/admin" : "/manager"')
  })
})

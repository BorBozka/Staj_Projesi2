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

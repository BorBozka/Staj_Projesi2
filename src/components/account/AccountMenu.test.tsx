import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { UserAvatar } from "@/components/account/UserAvatar"

const componentSource = readFileSync(resolve(process.cwd(), "src/components/account/AccountMenu.tsx"), "utf8")

describe("UserAvatar", () => {
  it("renders the existing blue initials fallback when there is no persisted avatar", () => {
    expect(renderToStaticMarkup(<UserAvatar fullName="Maya Kara" initials="MK" className="size-8" />)).toContain("MK")
    expect(renderToStaticMarkup(<UserAvatar fullName="Maya Kara" initials="MK" avatar="data:image/webp;base64,test" className="size-8" />)).toContain('src="data:image/webp;base64,test"')
  })
})

describe("AccountMenu", () => {
  it("marks the trigger as a menu with a chevron affordance in both variants", () => {
    const chevrons = componentSource.match(/<ChevronDown/g) ?? []
    expect(chevrons).toHaveLength(2)
    expect(componentSource).toContain("group-data-[state=open]:rotate-180")
    // Decorative: the button already carries the accessible name.
    expect(componentSource).not.toContain('<ChevronDown className')
    expect(componentSource).toContain('<ChevronDown aria-hidden="true"')
  })

  it("hides the chevron while the sidebar is collapsed to an icon rail", () => {
    expect(componentSource).toContain("{!collapsed && <ChevronDown")
  })

  it("keeps account actions shared while respecting authentication source", () => {
    expect(componentSource).toContain('profile.authenticationSource === "LOCAL"')
    expect(componentSource).toContain("Şifreyi değiştir")
    expect(componentSource).toContain("Profil fotoğrafını değiştir")
    expect(componentSource).toContain("Çıkış yap")
    expect(componentSource).toContain("useAuth")
    expect(componentSource).toContain("await logout()")
    expect(componentSource).toContain('navigate("/login", { replace: true })')
    expect(componentSource).toContain("normalizeAvatarFile")
    expect(componentSource).toContain('accept="image/jpeg,image/png,image/webp"')
    expect(componentSource).toContain('onCloseAutoFocus={handleCloseAutoFocus}')
    expect(componentSource).toContain('lastInteractionRef.current === "pointer"')
    expect(componentSource).toContain("markKeyboardInteraction")
    expect(componentSource).toContain('["Enter", " ", "ArrowDown"]')
    expect(componentSource).toContain("overflow-x-hidden")
    expect(componentSource).toContain("Fotoğraf seçin veya mevcut fotoğrafı kaldırın.")
    expect(componentSource).not.toContain("Profil fotoğrafınızı seçebilir veya mevcut fotoğrafınızı kaldırabilirsiniz.")
    expect(componentSource).not.toContain("Fotoğraf kare olarak düzenlenir")
    expect(componentSource).toContain('saving ? "Değiştiriliyor…" : "Şifreyi değiştir"')
    expect(componentSource).toContain('autoComplete="current-password"')
    expect(componentSource).toContain('autoComplete="new-password"')
  })
})

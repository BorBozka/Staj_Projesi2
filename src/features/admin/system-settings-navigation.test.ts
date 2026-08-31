import { describe, expect, it } from "vitest"

import { shouldBlockSystemSettingsNavigation } from "@/features/admin/system-settings-navigation"

describe("system settings navigation guard", () => {
  it("allows every navigation while operational settings are pristine", () => {
    expect(shouldBlockSystemSettingsNavigation(false, "/admin/system-settings", "/admin/dashboard")).toBe(false)
  })

  it("blocks a pathname change while operational settings are dirty", () => {
    expect(shouldBlockSystemSettingsNavigation(true, "/admin/system-settings", "/admin/dashboard")).toBe(true)
  })

  it("allows same-path tab and filter query changes while operational settings are dirty", () => {
    expect(shouldBlockSystemSettingsNavigation(true, "/admin/system-settings", "/admin/system-settings")).toBe(false)
  })
})

import { describe, expect, it } from "vitest"

import { defaultSystemSettingsTab, parseSystemSettingsTab, setSystemSettingsTab } from "@/features/admin/system-settings-tabs"

describe("System settings tab query state", () => {
  it("defaults to visit types when the parameter is missing or stale", () => {
    expect(parseSystemSettingsTab(null)).toBe(defaultSystemSettingsTab)
    expect(parseSystemSettingsTab("legacy")).toBe(defaultSystemSettingsTab)
  })

  it("parses every supported tab", () => {
    expect(parseSystemSettingsTab("types")).toBe("types")
    expect(parseSystemSettingsTab("cards")).toBe("cards")
    expect(parseSystemSettingsTab("rules")).toBe("rules")
    expect(parseSystemSettingsTab("operations")).toBe("operations")
  })

  it("updates only the tab query parameter", () => {
    expect(setSystemSettingsTab(new URLSearchParams("source=nav"), "cards").toString()).toBe("source=nav&tab=cards")
  })
})

export const systemSettingsTabs = ["types", "cards", "rules", "operations"] as const

export type SystemSettingsTab = (typeof systemSettingsTabs)[number]

export const defaultSystemSettingsTab: SystemSettingsTab = "types"

export function parseSystemSettingsTab(value: string | null): SystemSettingsTab {
  return systemSettingsTabs.includes(value as SystemSettingsTab) ? value as SystemSettingsTab : defaultSystemSettingsTab
}

export function setSystemSettingsTab(searchParams: URLSearchParams, tab: SystemSettingsTab): URLSearchParams {
  const next = new URLSearchParams(searchParams)
  next.set("tab", tab)
  return next
}

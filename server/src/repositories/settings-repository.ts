import type { OperationalSettings } from "../modules/settings/types.js"

export interface SettingsRepository {
  getOperationalSettings(): Promise<OperationalSettings | null>
  saveOperationalSettings(settings: Omit<OperationalSettings, "updatedAt">): Promise<OperationalSettings>
}

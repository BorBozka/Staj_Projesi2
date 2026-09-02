import type { SettingsRepository } from "../../../repositories/settings-repository.js"
import type { OperationalSettings } from "../types.js"

export class InMemorySettingsRepository implements SettingsRepository {
  private value: OperationalSettings | null
  constructor(initial: OperationalSettings | null = null) { this.value = initial ? structuredClone(initial) : null }
  async getOperationalSettings() { return this.value ? structuredClone(this.value) : null }
  async saveOperationalSettings(settings: Omit<OperationalSettings, "updatedAt">) { this.value = { ...settings, updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString() }; return structuredClone(this.value) }
}

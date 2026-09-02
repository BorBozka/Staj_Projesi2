import { ApiError } from "../../lib/api-error.js"
import type { SettingsRepository } from "../../repositories/settings-repository.js"
import type { OperationalSettings } from "./types.js"

export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}
  async getOperationalSettings() { return (await this.repository.getOperationalSettings()) ?? this.repository.saveOperationalSettings({ overdueToleranceMinutes: 15, overdueAlertRepeatMinutes: 10, workdayEndTime: "18:15" }) }
  async saveOperationalSettings(settings: Omit<OperationalSettings, "updatedAt">) {
    if (!Number.isInteger(settings.overdueToleranceMinutes) || settings.overdueToleranceMinutes < 0 || !Number.isInteger(settings.overdueAlertRepeatMinutes) || settings.overdueAlertRepeatMinutes < 1 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.workdayEndTime)) throw new ApiError(400, "VALIDATION_ERROR", "Operasyon parametreleri geçersiz.")
    return this.repository.saveOperationalSettings(settings)
  }
}

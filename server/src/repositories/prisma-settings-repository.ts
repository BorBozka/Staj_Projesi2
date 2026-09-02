import type { PrismaClient } from "@prisma/client"
import type { OperationalSettings } from "../modules/settings/types.js"
import type { SettingsRepository } from "./settings-repository.js"

const toSettings = (row: { overdueToleranceMinutes: number; overdueAlertRepeatMinutes: number; workdayEndTime: string; updatedAt: Date }): OperationalSettings => ({ overdueToleranceMinutes: row.overdueToleranceMinutes, overdueAlertRepeatMinutes: row.overdueAlertRepeatMinutes, workdayEndTime: row.workdayEndTime, updatedAt: row.updatedAt.toISOString() })

export class PrismaSettingsRepository implements SettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async getOperationalSettings() { const row = await this.prisma.operationalSettings.findUnique({ where: { id: "default" } }); return row ? toSettings(row) : null }
  async saveOperationalSettings(settings: Omit<OperationalSettings, "updatedAt">) { return toSettings(await this.prisma.operationalSettings.upsert({ where: { id: "default" }, update: settings, create: { id: "default", ...settings } })) }
}

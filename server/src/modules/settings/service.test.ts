import { describe, expect, it } from "vitest"
import { SettingsService } from "./service.js"
import { InMemorySettingsRepository } from "./testing/in-memory-settings-repository.js"

describe("SettingsService", () => {
  it("creates and returns the default singleton when missing", async () => {
    const service = new SettingsService(new InMemorySettingsRepository())
    await expect(service.getOperationalSettings()).resolves.toMatchObject({ overdueToleranceMinutes: 15, overdueAlertRepeatMinutes: 10, workdayEndTime: "18:15" })
  })
  it("rejects invalid minutes and time values, and updates valid settings", async () => {
    const service = new SettingsService(new InMemorySettingsRepository())
    await expect(service.saveOperationalSettings({ overdueToleranceMinutes: -1, overdueAlertRepeatMinutes: 10, workdayEndTime: "18:15" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
    await expect(service.saveOperationalSettings({ overdueToleranceMinutes: 0, overdueAlertRepeatMinutes: 0, workdayEndTime: "24:00" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
    await expect(service.saveOperationalSettings({ overdueToleranceMinutes: 5, overdueAlertRepeatMinutes: 15, workdayEndTime: "19:30" })).resolves.toMatchObject({ overdueToleranceMinutes: 5, overdueAlertRepeatMinutes: 15, workdayEndTime: "19:30" })
  })
})

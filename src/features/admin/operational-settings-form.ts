import { isOperationalSettingsValid, type OperationalSettings } from "@/domain/admin"

export interface OperationalSettingsDraft {
  overdueToleranceMinutes: string
  overdueAlertRepeatMinutes: string
}

export function createOperationalSettingsDraft(settings: OperationalSettings): OperationalSettingsDraft {
  return {
    overdueToleranceMinutes: String(settings.overdueToleranceMinutes),
    overdueAlertRepeatMinutes: String(settings.overdueAlertRepeatMinutes),
  }
}

function parseInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  return Number(value)
}

export function getOperationalSettingsDraftValue(draft: OperationalSettingsDraft): OperationalSettings | null {
  const overdueToleranceMinutes = parseInteger(draft.overdueToleranceMinutes)
  const overdueAlertRepeatMinutes = parseInteger(draft.overdueAlertRepeatMinutes)
  if (overdueToleranceMinutes === null || overdueAlertRepeatMinutes === null) return null
  const settings = { overdueToleranceMinutes, overdueAlertRepeatMinutes }
  return isOperationalSettingsValid(settings) ? settings : null
}

export function getOverdueToleranceError(value: string): string | null {
  const parsed = parseInteger(value)
  return parsed === null || parsed < 0 ? "0 veya daha büyük bir tam sayı girin." : null
}

export function getOverdueAlertRepeatError(value: string): string | null {
  const parsed = parseInteger(value)
  return parsed === null || parsed < 1 ? "1 veya daha büyük bir tam sayı girin." : null
}

export function isOperationalSettingsDraftDirty(persisted: OperationalSettings, draft: OperationalSettingsDraft): boolean {
  const parsed = getOperationalSettingsDraftValue(draft)
  if (!parsed) return draft.overdueToleranceMinutes !== String(persisted.overdueToleranceMinutes)
    || draft.overdueAlertRepeatMinutes !== String(persisted.overdueAlertRepeatMinutes)
  return parsed.overdueToleranceMinutes !== persisted.overdueToleranceMinutes
    || parsed.overdueAlertRepeatMinutes !== persisted.overdueAlertRepeatMinutes
}

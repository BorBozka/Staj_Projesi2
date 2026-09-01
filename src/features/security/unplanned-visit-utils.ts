export const DEFAULT_UNPLANNED_DURATION_MINUTES = 60
export const unplannedDurationOptions = [30, 60, 120, 240] as const
export const UNPLANNED_UNTIL_NOON = "until-noon"
export const UNPLANNED_UNTIL_WORKDAY_END = "until-workday-end"

export function getClockMinutes(value: Date): number {
  return value.getHours() * 60 + value.getMinutes()
}

export function getTimeOptionMinutes(value: string, now: Date, workdayEndTime: string): number | null {
  if (unplannedDurationOptions.includes(Number(value) as typeof unplannedDurationOptions[number])) return Number(value)
  const target = value === UNPLANNED_UNTIL_NOON ? 12 * 60 : value === UNPLANNED_UNTIL_WORKDAY_END ? parseClockTime(workdayEndTime) : null
  if (target === null) return null
  const duration = target - getClockMinutes(now)
  return duration > 0 ? duration : null
}

export function parseClockTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hours = Number(match[1]); const minutes = Number(match[2])
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null
}

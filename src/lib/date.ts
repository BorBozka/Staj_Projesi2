import { format } from "date-fns"
import { tr } from "date-fns/locale"

export function formatTr(date: Date, pattern: string) {
  return format(date, pattern, { locale: tr })
}

export interface IsoWallClockTime {
  hour: number
  minute: number
}

/**
 * Reads the wall-clock hour/minute directly out of an ISO timestamp's digits,
 * instead of converting through the runtime's system timezone (Date#getHours).
 * A Date is first normalized via toISOString() so "now" comparisons stay
 * consistent with stored ISO timestamps regardless of CI/deployment timezone.
 */
export function getIsoWallClockTime(value: Date | string): IsoWallClockTime | null {
  const isoString = typeof value === "string" ? value : value.toISOString()
  const match = isoString.match(/T(\d{2}):(\d{2})/)
  return match ? { hour: parseInt(match[1], 10), minute: parseInt(match[2], 10) } : null
}

export function getIsoHour(value: Date | string): number | null {
  return getIsoWallClockTime(value)?.hour ?? null
}

export function getIsoWallClockMinutes(value: Date | string): number | null {
  const time = getIsoWallClockTime(value)
  return time ? time.hour * 60 + time.minute : null
}

export function formatIsoWallClockTime(value: Date | string): string {
  const time = getIsoWallClockTime(value)
  return time ? `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}` : ""
}

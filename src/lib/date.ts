import { format } from "date-fns"
import { tr } from "date-fns/locale"

export function formatTr(date: Date, pattern: string) {
  return format(date, pattern, { locale: tr })
}

export interface IsoWallClockTime {
  hour: number
  minute: number
}

const istanbulWallClockFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Istanbul",
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
})

/**
 * Reads a wall-clock hour/minute for a given ISO timestamp string or a
 * moment in time, independent of the runtime's own system timezone.
 * - A string is read literally out of its ISO digits (e.g. stored
 *   "plannedStart" values already encode the intended wall-clock time).
 * - A Date represents an absolute instant, so it's converted to the
 *   Europe/Istanbul wall clock via Intl.DateTimeFormat, instead of
 *   Date#getHours()/toISOString() (both of which depend on/produce a
 *   timezone other than Istanbul depending on the runtime).
 */
export function getIsoWallClockTime(value: Date | string): IsoWallClockTime | null {
  if (typeof value === "string") {
    const match = value.match(/T(\d{2}):(\d{2})/)
    return match ? { hour: parseInt(match[1], 10), minute: parseInt(match[2], 10) } : null
  }

  if (Number.isNaN(value.getTime())) return null
  const parts = istanbulWallClockFormatter.formatToParts(value)
  const hour = parts.find((part) => part.type === "hour")?.value
  const minute = parts.find((part) => part.type === "minute")?.value
  return hour && minute ? { hour: parseInt(hour, 10), minute: parseInt(minute, 10) } : null
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

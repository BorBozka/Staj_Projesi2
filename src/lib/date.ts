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
 * A string keeps its stored wall-clock digits for legacy planned-visit data. A Date represents
 * an absolute instant and is converted through Europe/Istanbul rather than the runtime timezone.
 */
export function getIsoWallClockTime(value: Date | string): IsoWallClockTime | null {
  if (typeof value === "string") {
    const match = value.match(/T(\d{2}):(\d{2})/)
    return match ? { hour: parseInt(match[1], 10), minute: parseInt(match[2], 10) } : null
  }
  return getIstanbulWallClockTime(value)
}

// Use this for a timestamp that represents an absolute instant (including UTC-normalized mock
// seeds). Unlike getIsoWallClockTime it never reads ISO digits literally.
export function getIstanbulWallClockTime(value: Date | string): IsoWallClockTime | null {
  const instant = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(instant.getTime())) return null
  const parts = istanbulWallClockFormatter.formatToParts(instant)
  const hour = parts.find((part) => part.type === "hour")?.value
  const minute = parts.find((part) => part.type === "minute")?.value
  return hour && minute ? { hour: parseInt(hour, 10), minute: parseInt(minute, 10) } : null
}

export function getIsoHour(value: Date | string): number | null {
  return getIsoWallClockTime(value)?.hour ?? null
}

export function getIstanbulHour(value: Date | string): number | null {
  return getIstanbulWallClockTime(value)?.hour ?? null
}

export function getIsoWallClockMinutes(value: Date | string): number | null {
  const time = getIsoWallClockTime(value)
  return time ? time.hour * 60 + time.minute : null
}

export function formatIsoWallClockTime(value: Date | string): string {
  const time = getIsoWallClockTime(value)
  return time ? `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}` : ""
}

/**
 * Strict `YYYY-MM-DD` calendar-date parsing.
 *
 * A regex plus `new Date(value)` is not enough: `new Date("2026-02-31T12:00:00")` silently
 * rolls forward to 3 March 2026 and reports a valid time, so `2026-02-31`, `2026-04-31`,
 * `2025-02-29`, and `2026-13-01` all pass a naive check. This module round-trips the parsed
 * fields through a UTC `Date` and rejects anything that does not come back unchanged.
 */
export interface CalendarDate {
  /** Full year, e.g. 2026. */
  year: number
  /** Month 1-12. */
  month: number
  /** Day of month 1-31, valid for the given month/year. */
  day: number
}

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Parses a strict `YYYY-MM-DD` string. Returns `null` for any malformed string or any date that
 * does not exist on the proleptic Gregorian calendar (bad month, bad day, non-leap 29 Feb, …).
 */
export function parseCalendarDate(value: string): CalendarDate | null {
  const match = CALENDAR_DATE_PATTERN.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const roundTrip = new Date(Date.UTC(year, month - 1, day))
  if (
    roundTrip.getUTCFullYear() !== year
    || roundTrip.getUTCMonth() !== month - 1
    || roundTrip.getUTCDate() !== day
  ) {
    return null
  }

  return { year, month, day }
}

/** `true` only for a strict `YYYY-MM-DD` string naming a real calendar date. */
export function isValidCalendarDate(value: string): boolean {
  return parseCalendarDate(value) !== null
}

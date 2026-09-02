import { describe, expect, it } from "vitest"

import { isValidCalendarDate, parseCalendarDate } from "./calendar-date.js"

describe("parseCalendarDate", () => {
  it("accepts real calendar dates and returns their parts", () => {
    expect(parseCalendarDate("2026-09-02")).toEqual({ year: 2026, month: 9, day: 2 })
    expect(parseCalendarDate("2024-02-29")).toEqual({ year: 2024, month: 2, day: 29 })
    expect(parseCalendarDate("2026-12-31")).toEqual({ year: 2026, month: 12, day: 31 })
    expect(parseCalendarDate("2000-02-29")).not.toBeNull()
  })

  it("rejects impossible civil dates that Date() would silently roll forward", () => {
    expect(parseCalendarDate("2026-02-31")).toBeNull()
    expect(parseCalendarDate("2026-04-31")).toBeNull()
    expect(parseCalendarDate("2025-02-29")).toBeNull()
    expect(parseCalendarDate("1900-02-29")).toBeNull()
  })

  it("rejects out-of-range and malformed components", () => {
    expect(parseCalendarDate("2026-13-01")).toBeNull()
    expect(parseCalendarDate("2026-00-10")).toBeNull()
    expect(parseCalendarDate("2026-09-00")).toBeNull()
    expect(parseCalendarDate("2026-9-2")).toBeNull()
    expect(parseCalendarDate("2026/09/02")).toBeNull()
    expect(parseCalendarDate("2026-09-02T00:00:00Z")).toBeNull()
    expect(parseCalendarDate("")).toBeNull()
    expect(parseCalendarDate("0050-01-01")).toBeNull()
  })
})

describe("isValidCalendarDate", () => {
  it("is a boolean shorthand for parseCalendarDate", () => {
    expect(isValidCalendarDate("2026-09-02")).toBe(true)
    expect(isValidCalendarDate("2026-02-31")).toBe(false)
  })
})

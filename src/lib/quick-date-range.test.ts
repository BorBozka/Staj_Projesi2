import { describe, expect, it } from "vitest"

import { getQuickDateRangeOptions, matchesQuickDateRange } from "@/lib/quick-date-range"

describe("shared quick date ranges", () => {
  const now = new Date("2026-08-17T12:00:00+03:00")

  it("provides the four common shortcut ranges", () => {
    expect(getQuickDateRangeOptions(now)).toMatchObject([
      { key: "today", startDate: "2026-08-17", endDate: "2026-08-17" },
      { key: "7d", startDate: "2026-08-11", endDate: "2026-08-17" },
      { key: "30d", startDate: "2026-07-19", endDate: "2026-08-17" },
      { key: "month", startDate: "2026-08-01", endDate: "2026-08-17" },
    ])
  })

  it("matches only the complete selected range", () => {
    const option = getQuickDateRangeOptions(now)[0]
    expect(matchesQuickDateRange({ startDate: "2026-08-17", endDate: "2026-08-17" }, option)).toBe(true)
    expect(matchesQuickDateRange({ startDate: "2026-08-16", endDate: "2026-08-17" }, option)).toBe(false)
  })
})

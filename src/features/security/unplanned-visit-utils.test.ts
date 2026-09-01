import { describe, expect, it } from "vitest"
import { getTimeOptionMinutes, UNPLANNED_UNTIL_NOON, UNPLANNED_UNTIL_WORKDAY_END } from "./unplanned-visit-utils"

describe("unplanned duration choices", () => {
  it("keeps fixed choices and calculates until-noon from the current time", () => {
    expect(getTimeOptionMinutes("60", new Date(2026, 8, 1, 10, 0), "18:15")).toBe(60)
    expect(getTimeOptionMinutes(UNPLANNED_UNTIL_NOON, new Date(2026, 8, 1, 10, 30), "18:15")).toBe(90)
    expect(getTimeOptionMinutes(UNPLANNED_UNTIL_NOON, new Date(2026, 8, 1, 12, 0), "18:15")).toBeNull()
  })

  it("uses the configured workday end and hides expired targets", () => {
    expect(getTimeOptionMinutes(UNPLANNED_UNTIL_WORKDAY_END, new Date(2026, 8, 1, 16, 15), "18:15")).toBe(120)
    expect(getTimeOptionMinutes(UNPLANNED_UNTIL_WORKDAY_END, new Date(2026, 8, 1, 18, 15), "18:15")).toBeNull()
  })
})

import { DEFAULT_UNPLANNED_DURATION_MINUTES, unplannedDurationOptions } from "@/features/security/unplanned-visit-utils"

describe("unplanned visit duration defaults", () => {
  it("defaults to one hour and retains the approved quick durations", () => {
    expect(DEFAULT_UNPLANNED_DURATION_MINUTES).toBe(60)
    expect(unplannedDurationOptions).toEqual([30, 60, 120, 240])
  })
})

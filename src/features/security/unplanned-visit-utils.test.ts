import { describe, expect, it } from "vitest"

import { DEFAULT_UNPLANNED_DURATION_MINUTES, getUnplannedDurationError, unplannedDurationOptions } from "@/features/security/unplanned-visit-utils"

describe("unplanned visit duration defaults", () => {
  it("defaults to one hour and retains the approved quick durations", () => {
    expect(DEFAULT_UNPLANNED_DURATION_MINUTES).toBe(60)
    expect(unplannedDurationOptions).toEqual([30, 60, 120, 240])
  })

  it("accepts only positive whole custom minutes", () => {
    expect(getUnplannedDurationError("75")).toBeNull()
    expect(getUnplannedDurationError("0")).toBeTruthy()
    expect(getUnplannedDurationError("12.5")).toBeTruthy()
  })
})

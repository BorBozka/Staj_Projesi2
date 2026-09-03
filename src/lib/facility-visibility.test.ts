import { describe, expect, it } from "vitest"

import { shouldShowDifferentFacility } from "@/lib/facility-visibility"

describe("shouldShowDifferentFacility", () => {
  it("hides the facility at the current facility and shows a different one", () => {
    expect(shouldShowDifferentFacility("facility-1", "facility-1")).toBe(false)
    expect(shouldShowDifferentFacility("facility-2", "facility-1")).toBe(true)
  })
})

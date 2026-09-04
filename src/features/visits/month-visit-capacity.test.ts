import { describe, expect, it } from "vitest"

import { getMonthVisibleVisitCount } from "@/features/visits/month-visit-capacity"

describe("getMonthVisibleVisitCount", () => {
  it("keeps all blocks when they fit in the fixed month-cell content height", () => {
    expect(getMonthVisibleVisitCount({ availableHeight: 74, visitHeight: 22, itemGap: 4, overflowHeight: 18, visitCount: 3 })).toBe(3)
  })

  it("reserves the actual overflow-link height before choosing visible blocks", () => {
    expect(getMonthVisibleVisitCount({ availableHeight: 70, visitHeight: 22, itemGap: 4, overflowHeight: 18, visitCount: 4 })).toBe(2)
    expect(getMonthVisibleVisitCount({ availableHeight: 60, visitHeight: 22, itemGap: 4, overflowHeight: 18, visitCount: 4 })).toBe(1)
  })

  it("never returns more visible blocks than the cell can hold or than exist", () => {
    expect(getMonthVisibleVisitCount({ availableHeight: 18, visitHeight: 22, itemGap: 4, overflowHeight: 18, visitCount: 4 })).toBe(0)
    expect(getMonthVisibleVisitCount({ availableHeight: 500, visitHeight: 22, itemGap: 4, overflowHeight: 18, visitCount: 2 })).toBe(2)
  })
})

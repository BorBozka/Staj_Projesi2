import { describe, expect, it } from "vitest"

import { getPageCount, paginate } from "@/lib/pagination"

describe("paginate", () => {
  it("slices the requested page", () => {
    expect(paginate([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4])
  })

  it("returns an empty array past the last page", () => {
    expect(paginate([1, 2, 3], 5, 2)).toEqual([])
  })
})

describe("getPageCount", () => {
  it("rounds up to cover the remainder", () => {
    expect(getPageCount(5, 2)).toBe(3)
  })

  it("returns at least 1 page for an empty total", () => {
    expect(getPageCount(0, 2)).toBe(1)
  })
})

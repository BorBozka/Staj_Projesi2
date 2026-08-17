import { describe, expect, it } from "vitest"

import { toggleSort } from "@/lib/sort"

describe("toggleSort", () => {
  it("adds a field as ascending when it isn't sorted yet", () => {
    expect(toggleSort([], "name")).toEqual([{ field: "name", direction: "asc" }])
  })

  it("flips an ascending field to descending", () => {
    expect(toggleSort([{ field: "name", direction: "asc" }], "name")).toEqual([{ field: "name", direction: "desc" }])
  })

  it("removes a descending field", () => {
    expect(toggleSort([{ field: "name", direction: "desc" }], "name")).toEqual([])
  })

  it("leaves other fields untouched", () => {
    const sorts = [{ field: "name", direction: "asc" as const }, { field: "status", direction: "desc" as const }]
    expect(toggleSort(sorts, "name")).toEqual([{ field: "name", direction: "desc" }, { field: "status", direction: "desc" }])
  })
})

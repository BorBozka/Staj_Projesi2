import { describe, expect, it } from "vitest"

import { foldTr } from "@/lib/turkish"

describe("foldTr", () => {
  it("folds dotted I to dotted i and dotless I to dotless ı", () => {
    expect(foldTr("İSTANBUL")).toBe("istanbul")
    expect(foldTr("ISPARTA")).toBe("ısparta")
  })

  it("lets a dotted-i query match a dotted-İ name and vice versa", () => {
    expect(foldTr("İpek").includes(foldTr("ipe"))).toBe(true)
    expect(foldTr("ILGIN").includes(foldTr("ılg"))).toBe(true)
  })

  it("leaves already-lowercase Turkish text unchanged", () => {
    expect(foldTr("çğıöşü")).toBe("çğıöşü")
  })
})

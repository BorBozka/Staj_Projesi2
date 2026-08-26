import { describe, expect, it } from "vitest"

import { canCorrectVisit } from "@/domain/visit-corrections"

describe("admin visit-correction boundary", () => {
  it("reserves future corrective actions for Admin without changing Manager read access", () => {
    expect(canCorrectVisit("ADMIN")).toBe(true)
    expect(canCorrectVisit("MANAGER")).toBe(false)
  })
})

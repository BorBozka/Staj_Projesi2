import { describe, expect, it } from "vitest"

import type { VisitTypeDefinition } from "@/domain/admin"
import { getVisitTypeNameError, isVisitTypeDraftDirty } from "@/features/admin/visit-type-form"

const original: VisitTypeDefinition = { id: "type-1", name: "Toplantı", active: true }

describe("Visit type form validation and dirty state", () => {
  it("rejects empty and whitespace-only names", () => {
    expect(getVisitTypeNameError("")).not.toBeNull()
    expect(getVisitTypeNameError("   ")).not.toBeNull()
  })

  it("accepts a valid create name", () => {
    expect(getVisitTypeNameError("Tedarikçi")).toBeNull()
  })

  it("keeps an unchanged edit pristine and tracks name or active changes", () => {
    expect(isVisitTypeDraftDirty(original, { ...original })).toBe(false)
    expect(isVisitTypeDraftDirty(original, { ...original, name: "Müşteri ziyareti" })).toBe(true)
    expect(isVisitTypeDraftDirty(original, { ...original, active: false })).toBe(true)
  })
})

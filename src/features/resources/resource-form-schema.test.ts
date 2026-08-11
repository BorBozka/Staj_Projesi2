import { describe, expect, it } from "vitest"

import { resourceFormSchema, toResourceInput } from "@/features/resources/resource-form-schema"

const validRoom = {
  type: "ROOM" as const,
  name: "Atlas",
  companyId: "bplas",
  facilityId: "bplas-merkez",
  totalQuantity: "",
}

describe("resourceFormSchema", () => {
  it("accepts a room without quantity and omits quantity from the input", () => {
    const parsed = resourceFormSchema.parse(validRoom)

    expect(toResourceInput(parsed).totalQuantity).toBeUndefined()
  })

  it("accepts pooled equipment with a positive whole-number quantity", () => {
    const parsed = resourceFormSchema.parse({ ...validRoom, type: "POOLED_EQUIPMENT", totalQuantity: "8" })

    expect(toResourceInput(parsed).totalQuantity).toBe(8)
  })

  it.each(["", "0", "-1", "1.5"])("rejects invalid pooled-equipment quantity %s", (totalQuantity) => {
    const parsed = resourceFormSchema.safeParse({ ...validRoom, type: "POOLED_EQUIPMENT", totalQuantity })

    expect(parsed.success).toBe(false)
  })
})

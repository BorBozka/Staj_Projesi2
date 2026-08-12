import { describe, expect, it } from "vitest"

import { resourceFormSchema, toResourceInput, type ResourceFormValues } from "@/features/resources/resource-form-schema"

const validRoom: ResourceFormValues = {
  type: "ROOM",
  name: "Atlas",
  brand: "",
  model: "",
  licensePlate: "",
  fullName: "",
  licenseClasses: "",
  documents: "",
  canDriveCommercialVehicles: "no",
  companyId: "bplas",
  facilityId: "bplas-merkez",
  totalQuantity: "",
}

describe("resourceFormSchema", () => {
  it("accepts a room without quantity", () => {
    expect(toResourceInput(resourceFormSchema.parse(validRoom))).toEqual({
      type: "ROOM",
      name: "Atlas",
      companyId: "bplas",
      facilityId: "bplas-merkez",
    })
  })

  it("accepts pooled equipment with a positive whole-number quantity", () => {
    const parsed = resourceFormSchema.parse({ ...validRoom, type: "POOLED_EQUIPMENT", totalQuantity: "8" })

    expect(toResourceInput(parsed)).toMatchObject({ type: "POOLED_EQUIPMENT", totalQuantity: 8 })
  })

  it.each(["", "0", "-1", "1.5"])("rejects invalid pooled-equipment quantity %s", (totalQuantity) => {
    expect(resourceFormSchema.safeParse({ ...validRoom, type: "POOLED_EQUIPMENT", totalQuantity }).success).toBe(false)
  })

  it("maps separate vehicle fields without a quantity", () => {
    const values = resourceFormSchema.parse({
      ...validRoom,
      type: "VEHICLE",
      name: "",
      brand: " Ford ",
      model: " Transit ",
      licensePlate: " 16  bpl\t101 ",
    })

    expect(toResourceInput(values)).toEqual({
      type: "VEHICLE",
      brand: "Ford",
      model: "Transit",
      licensePlate: "16 BPL 101",
      companyId: "bplas",
      facilityId: "bplas-merkez",
    })
  })

  it("normalizes vehicle plate whitespace and casing", () => {
    const values = resourceFormSchema.parse({
      ...validRoom,
      type: "VEHICLE",
      brand: "Ford",
      model: "Transit",
      licensePlate: " 16  bpl\t101 ",
    })

    expect(toResourceInput(values)).toMatchObject({ licensePlate: "16 BPL 101" })
  })

  it.each(["brand", "model", "licensePlate"] as const)("requires vehicle %s", (field) => {
    const result = resourceFormSchema.safeParse({
      ...validRoom,
      type: "VEHICLE",
      name: "",
      brand: "Ford",
      model: "Transit",
      licensePlate: "16 BPL 101",
      [field]: " ",
    })

    expect(result.success).toBe(false)
  })

  it("maps driver lists and the commercial vehicle choice", () => {
    const values = resourceFormSchema.parse({
      ...validRoom,
      type: "DRIVER",
      name: "",
      fullName: " Ayşe Demir ",
      licenseClasses: "B, C\nD",
      documents: "SRC2, Psikoteknik",
      canDriveCommercialVehicles: "yes",
    })

    expect(toResourceInput(values)).toEqual({
      type: "DRIVER",
      fullName: "Ayşe Demir",
      licenseClasses: ["B", "C", "D"],
      documents: ["SRC2", "Psikoteknik"],
      canDriveCommercialVehicles: true,
      companyId: "bplas",
      facilityId: "bplas-merkez",
    })
  })

  it("rejects a driver without a license class", () => {
    expect(resourceFormSchema.safeParse({
      ...validRoom,
      type: "DRIVER",
      name: "",
      fullName: "Ayşe Demir",
      licenseClasses: " , \n ",
    }).success).toBe(false)
  })
})

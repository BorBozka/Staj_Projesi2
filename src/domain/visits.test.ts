import { describe, expect, it } from "vitest"

import { hasVisitorEmail, isValidVisitorEmail, normalizeVehiclePlate, normalizeVisitorEmail } from "@/domain/visits"

describe("visitor email helpers", () => {
  it("normalizes blank/whitespace email to undefined and trims a real value", () => {
    expect(normalizeVisitorEmail("")).toBeUndefined()
    expect(normalizeVisitorEmail("   ")).toBeUndefined()
    expect(normalizeVisitorEmail(undefined)).toBeUndefined()
    expect(normalizeVisitorEmail(" user@example.com ")).toBe("user@example.com")
  })

  it("validates email format only for non-empty values", () => {
    expect(isValidVisitorEmail("test@")).toBe(false)
    expect(isValidVisitorEmail("invalid")).toBe(false)
    expect(isValidVisitorEmail("user@example.com")).toBe(true)
  })

  it("treats a visitor as having an email only when one is set", () => {
    expect(hasVisitorEmail({ email: undefined })).toBe(false)
    expect(hasVisitorEmail({ email: "user@example.com" })).toBe(true)
  })
})

describe("normalizeVehiclePlate", () => {
  it("trims, uppercases, and normalizes blank input to undefined", () => {
    expect(normalizeVehiclePlate(undefined)).toBeUndefined()
    expect(normalizeVehiclePlate("   ")).toBeUndefined()
    expect(normalizeVehiclePlate(" 34 abc 123 ")).toBe("34 ABC 123")
  })

  it("does not enforce a Turkey-specific plate format", () => {
    expect(normalizeVehiclePlate("XYZ-9999")).toBe("XYZ-9999")
  })
})

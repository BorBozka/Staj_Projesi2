import { describe, expect, it } from "vitest"

import { toVisitInput, visitFormSchema } from "@/features/visits/visit-form-schema"

const validValues = {
  visitorFirstName: "Deniz",
  visitorLastName: "Aksoy",
  visitorEmail: "deniz.aksoy@example.com",
  visitTypeId: "meeting",
  hostEmployeeName: "Maya Kara",
  hostCompanyId: "bplas",
  facilityId: "bplas-merkez",
  visitDate: "2026-08-10",
  startTime: "09:00",
  endTime: "10:00",
}

describe("visitFormSchema", () => {
  it("accepts a valid start and end time", () => {
    expect(visitFormSchema.safeParse(validValues).success).toBe(true)
  })

  it("rejects an end time that is not after the start time", () => {
    const result = visitFormSchema.safeParse({ ...validValues, endTime: "09:00" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some((issue) => issue.path.includes("endTime"))).toBe(true)
  })

  it("rejects invalid required values", () => {
    expect(visitFormSchema.safeParse({ ...validValues, visitorEmail: "invalid-email", startTime: "" }).success).toBe(false)
  })

  it("accepts an optional mobile phone only in the expected format", () => {
    expect(visitFormSchema.safeParse({ ...validValues, visitorPhone: "" }).success).toBe(true)
    expect(visitFormSchema.safeParse({ ...validValues, visitorPhone: "532 123 45 67" }).success).toBe(true)
    expect(visitFormSchema.safeParse({ ...validValues, visitorPhone: "0532 123 45 67" }).success).toBe(false)
  })

  it("accepts an international phone with a selected country code", () => {
    expect(visitFormSchema.safeParse({ ...validValues, phoneCountryCode: "+44", visitorPhone: "2079460123" }).success).toBe(true)
  })

  it("keeps the additional requirement note separate and omits it when the checkbox is off", () => {
    const selected = visitFormSchema.parse({
      ...validValues,
      note: "Genel not",
      hasAdditionalRequirements: true,
      additionalRequirementNote: "Projeksiyon gerekiyor.",
    })
    const cleared = visitFormSchema.parse({
      ...validValues,
      hasAdditionalRequirements: false,
      additionalRequirementNote: "Gönderilmemeli",
    })

    expect(toVisitInput(selected)).toMatchObject({ note: "Genel not", additionalRequirementNote: "Projeksiyon gerekiyor." })
    expect(toVisitInput(cleared).additionalRequirementNote).toBeUndefined()
  })
})

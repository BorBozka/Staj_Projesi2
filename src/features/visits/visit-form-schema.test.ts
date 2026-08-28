import { describe, expect, it } from "vitest"

import { toMeetingInput, visitFormSchema } from "@/features/visits/visit-form-schema"

const validVisitor = {
  visitorFirstName: "Deniz",
  visitorLastName: "Aksoy",
  visitorEmail: "deniz.aksoy@example.com",
  visitorCompany: "Aksoy Lojistik",
}

const validValues = {
  visitors: [validVisitor],
  visitTypeId: "meeting",
  hostEmployeeName: "Maya Kara",
  hostCompanyId: "bplas",
  facilityId: "bplas-merkez",
  visitDate: "2026-08-10",
  startTime: "09:00",
  endTime: "10:00",
}

describe("visitFormSchema", () => {
  it("requires at least one visitor", () => {
    expect(visitFormSchema.safeParse(validValues).success).toBe(true)
    expect(visitFormSchema.safeParse({ ...validValues, visitors: [] }).success).toBe(false)
  })

  it("validates first name, last name, email, and company separately for every visitor", () => {
    const result = visitFormSchema.safeParse({
      ...validValues,
      visitors: [
        validVisitor,
        { visitorFirstName: "", visitorLastName: "", visitorEmail: "invalid-email", visitorCompany: "" },
      ],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(expect.arrayContaining([
        "visitors.1.visitorFirstName",
        "visitors.1.visitorLastName",
        "visitors.1.visitorEmail",
        "visitors.1.visitorCompany",
      ]))
    }
  })

  it("rejects an end time that is not after the start time", () => {
    const result = visitFormSchema.safeParse({ ...validValues, endTime: "09:00" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some((issue) => issue.path.includes("endTime"))).toBe(true)
  })

  it("treats visitor email as optional: blank and whitespace-only pass, invalid non-empty values fail, and blank normalizes to undefined", () => {
    expect(visitFormSchema.safeParse({ ...validValues, visitors: [{ ...validVisitor, visitorEmail: "" }] }).success).toBe(true)
    expect(visitFormSchema.safeParse({ ...validValues, visitors: [{ ...validVisitor, visitorEmail: "   " }] }).success).toBe(true)
    expect(visitFormSchema.safeParse({ ...validValues, visitors: [{ ...validVisitor, visitorEmail: "test@" }] }).success).toBe(false)
    expect(visitFormSchema.safeParse({ ...validValues, visitors: [{ ...validVisitor, visitorEmail: "user@example.com" }] }).success).toBe(true)

    const parsed = visitFormSchema.parse({ ...validValues, visitors: [{ ...validVisitor, visitorEmail: "   " }] })
    expect(toMeetingInput(parsed).visitors[0].email).toBeUndefined()
  })

  it("accepts optional and international visitor phone values independently", () => {
    expect(visitFormSchema.safeParse({ ...validValues, visitors: [{ ...validVisitor, visitorPhone: "" }] }).success).toBe(true)
    expect(visitFormSchema.safeParse({ ...validValues, visitors: [{ ...validVisitor, visitorPhone: "532 123 45 67" }] }).success).toBe(true)
    expect(visitFormSchema.safeParse({ ...validValues, visitors: [{ ...validVisitor, visitorPhone: "0532 123 45 67" }] }).success).toBe(false)
    expect(visitFormSchema.safeParse({ ...validValues, visitors: [{ ...validVisitor, phoneCountryCode: "+44", visitorPhone: "2079460123" }] }).success).toBe(true)
  })

  it("maps several visitors and keeps the additional requirement note separate", () => {
    const selected = visitFormSchema.parse({
      ...validValues,
      visitors: [validVisitor, { ...validVisitor, visitorFirstName: "Bora", visitorEmail: "bora@example.com" }],
      note: "Genel not",
      hasAdditionalRequirements: true,
      additionalRequirementNote: "Projeksiyon gerekiyor.",
    })
    const cleared = visitFormSchema.parse({
      ...validValues,
      hasAdditionalRequirements: false,
      additionalRequirementNote: "Gönderilmemeli",
    })

    expect(toMeetingInput(selected)).toMatchObject({
      visitors: [{ firstName: "Deniz", company: "Aksoy Lojistik" }, { firstName: "Bora", company: "Aksoy Lojistik" }],
      note: "Genel not",
      additionalRequirementNote: "Projeksiyon gerekiyor.",
    })
    expect(toMeetingInput(cleared).additionalRequirementNote).toBeUndefined()
  })
})

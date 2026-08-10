import { describe, expect, it } from "vitest"

import { visitFormSchema } from "@/features/visits/visit-form-schema"

const validValues = {
  visitorFirstName: "Deniz",
  visitorLastName: "Aksoy",
  visitorEmail: "deniz.aksoy@example.com",
  visitTypeId: "meeting",
  hostEmployeeId: "maya-kara",
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
})

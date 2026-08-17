import { describe, expect, it } from "vitest"

import type { PlannedTransportAssignment } from "@/domain/transport-assignments"
import { transportAssignmentFormSchema } from "@/features/transport/transport-assignment-form-schema"
import { buildTransportAvailabilityInput, formatTransportAssignmentSchedule, getTransportAssignmentFormTimes, isUntimedDailyTransportAssignment } from "@/features/transport/transport-assignment-time"

const formValues = {
  companyId: "bplas",
  facilityId: "bplas-merkez",
  date: "2027-01-20",
  startTime: "",
  endTime: "",
  purpose: "Günlük saha görevi",
  vehicleResourceId: "vehicle-1",
  driverResourceId: "driver-1",
  relatedKind: "none" as const,
  relatedId: "",
}

describe("transport assignment time handling", () => {
  it("requires the date while allowing both times to be omitted together", () => {
    expect(transportAssignmentFormSchema.safeParse(formValues).success).toBe(true)
    expect(transportAssignmentFormSchema.safeParse({ ...formValues, date: "" }).success).toBe(false)
    expect(transportAssignmentFormSchema.safeParse({ ...formValues, startTime: "09:00" }).success).toBe(false)
    expect(transportAssignmentFormSchema.safeParse({ ...formValues, startTime: "09:00", endTime: "10:00" }).success).toBe(true)
  })

  it("maps an untimed date to a half-open full-day reservation", () => {
    const input = buildTransportAvailabilityInput("bplas", "bplas-merkez", "2027-01-20", "", "")!
    const start = new Date(input.plannedStart)
    const end = new Date(input.plannedEnd)

    expect(start.getHours()).toBe(0)
    expect(end.getHours()).toBe(0)
    expect(end.getDate()).toBe(start.getDate() + 1)
    expect(buildTransportAvailabilityInput("bplas", "bplas-merkez", "2027-01-20", "09:00", "")).toBeNull()
  })

  it("restores and labels an untimed daily assignment without synthetic midnight times", () => {
    const input = buildTransportAvailabilityInput("bplas", "bplas-merkez", "2027-01-20", "", "")!
    const assignment = { plannedStart: input.plannedStart, plannedEnd: input.plannedEnd } as PlannedTransportAssignment

    expect(isUntimedDailyTransportAssignment(assignment)).toBe(true)
    expect(getTransportAssignmentFormTimes(assignment)).toEqual({ startTime: "", endTime: "" })
    expect(formatTransportAssignmentSchedule(assignment, true)).toContain("Saat belirtilmedi")
  })
})

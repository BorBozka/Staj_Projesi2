import { describe, expect, it } from "vitest"

import type { PlannedTransportAssignment } from "@/domain/transport-assignments"
import { filterAssignmentsForReport } from "@/features/reports/fleet-report-utils"
import { getComparisonPeriod, getDefaultReportsRange, type ReportsScopeFilters } from "@/features/reports/reports-filters"
import { initialMockResources } from "@/services/mock-resource-data"
import { mockScenarioNow } from "@/services/mock-scenario"
import { initialMockTransportAssignments } from "@/services/mock-transport-assignment-data"
import { initialMockMeetings, initialMockVisitRecords } from "@/services/mock-visit-data"

const defaultRange = getDefaultReportsRange(mockScenarioNow)
const allScope = (range: { startDate: string; endDate: string }): ReportsScopeFilters => ({ ...range, companyId: "all", facilityId: "all" })
const previousRange = getComparisonPeriod(defaultRange, "previous")!
const previousYearRange = getComparisonPeriod(defaultRange, "previous-year")!
const current = filterAssignmentsForReport(initialMockTransportAssignments, allScope(defaultRange))
const previous = filterAssignmentsForReport(initialMockTransportAssignments, allScope(previousRange))
const previousYear = filterAssignmentsForReport(initialMockTransportAssignments, allScope(previousYearRange))

describe("deterministic mock transport report dataset", () => {
  it("supplies realistic assignment volume for all comparison periods", () => {
    expect(initialMockTransportAssignments).toHaveLength(137)
    expect(current).toHaveLength(57)
    expect(previous).toHaveLength(40)
    expect(previousYear).toHaveLength(38)
  })

  it("covers diverse current resources, scopes, durations, and cancellations", () => {
    const active = current.filter((assignment) => assignment.status === "ACTIVE")
    expect(new Set(active.map((assignment) => assignment.vehicleResourceId)).size).toBe(9)
    expect(new Set(active.map((assignment) => assignment.driverResourceId)).size).toBe(9)
    expect(new Set(current.map((assignment) => assignment.facilityId))).toEqual(new Set(["bplas-merkez", "bplas-arge", "otomotiv-uretim"]))
    expect(current.filter((assignment) => assignment.status === "CANCELLED")).toHaveLength(9)
    const durations = new Set(active.map(durationMinutes))
    expect([30, 45, 60, 90, 120, 150, 180, 240].every((duration) => durations.has(duration))).toBe(true)
  })

  it("keeps current-only and previous-only resources visible for comparison", () => {
    const currentVehicles = new Set(current.map((assignment) => assignment.vehicleResourceId))
    const previousVehicles = new Set(previous.map((assignment) => assignment.vehicleResourceId))
    expect([...currentVehicles].some((id) => !previousVehicles.has(id))).toBe(true)
    expect([...previousVehicles].some((id) => !currentVehicles.has(id))).toBe(true)
  })

  it("never overlaps active assignments for the same vehicle or driver", () => {
    const active = initialMockTransportAssignments.filter((assignment) => assignment.status === "ACTIVE")
    for (let leftIndex = 0; leftIndex < active.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < active.length; rightIndex += 1) {
        const left = active[leftIndex]
        const right = active[rightIndex]
        if (left.vehicleResourceId !== right.vehicleResourceId && left.driverResourceId !== right.driverResourceId) continue
        expect(rangesOverlap(left, right), `${left.id} overlaps ${right.id}`).toBe(false)
      }
    }
  })

  it("uses valid catalog resources and immutable display snapshots", () => {
    const resources = new Map(initialMockResources.map((resource) => [resource.id, resource]))
    for (const assignment of initialMockTransportAssignments) {
      const vehicle = resources.get(assignment.vehicleResourceId)
      const driver = resources.get(assignment.driverResourceId)
      expect(vehicle?.type).toBe("VEHICLE")
      expect(driver?.type).toBe("DRIVER")
      if (vehicle?.type === "VEHICLE") {
        expect(assignment.vehicleName).toBe([vehicle.brand, vehicle.model].join(" "))
        expect(assignment.vehicleLicensePlate).toBe(vehicle.licensePlate)
      }
      if (driver?.type === "DRIVER") expect(assignment.driverName).toBe(driver.fullName)
      expect(assignment.companyId).toBe(vehicle?.companyId)
      expect(assignment.facilityId).toBe(vehicle?.facilityId)
    }
  })

  it("resolves every supplied Meeting or Visit relation in the same organization scope", () => {
    const meetings = new Map(initialMockMeetings.map((meeting) => [meeting.id, meeting]))
    const visits = new Map(initialMockVisitRecords.map((visit) => [visit.id, visit]))
    for (const assignment of initialMockTransportAssignments) {
      if (assignment.relatedMeetingId) {
        const meeting = meetings.get(assignment.relatedMeetingId)
        expect(meeting, assignment.relatedMeetingId).toBeDefined()
        expect(meeting?.hostCompanyId).toBe(assignment.companyId)
        expect(meeting?.facilityId).toBe(assignment.facilityId)
      }
      if (assignment.relatedVisitId) {
        const visit = visits.get(assignment.relatedVisitId)
        const meeting = visit ? meetings.get(visit.meetingId) : undefined
        expect(visit, assignment.relatedVisitId).toBeDefined()
        expect(meeting?.hostCompanyId).toBe(assignment.companyId)
        expect(meeting?.facilityId).toBe(assignment.facilityId)
      }
    }
  })
})

function durationMinutes(assignment: PlannedTransportAssignment) {
  return (new Date(assignment.plannedEnd).getTime() - new Date(assignment.plannedStart).getTime()) / 60_000
}

function rangesOverlap(left: PlannedTransportAssignment, right: PlannedTransportAssignment) {
  return new Date(left.plannedStart).getTime() < new Date(right.plannedEnd).getTime()
    && new Date(left.plannedEnd).getTime() > new Date(right.plannedStart).getTime()
}

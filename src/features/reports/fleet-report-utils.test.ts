import { describe, expect, it } from "vitest"

import type { PlannedTransportAssignment } from "@/domain/transport-assignments"
import type { Meeting, Visit } from "@/domain/visits"
import type { ReportsScopeFilters } from "@/features/reports/reports-filters"
import {
  calculateFleetReportKpis,
  filterAssignmentsForReport,
  FLEET_REPORT_PAGE_SIZE,
  getFleetReportPageCount,
  getRelatedRecordLabel,
  paginateFleetReport,
} from "@/features/reports/fleet-report-utils"

const baseFilters: ReportsScopeFilters = { startDate: "", endDate: "", companyId: "all", facilityId: "all" }

const assignments = [
  assignment("1", "2026-08-10T08:00:00+03:00", "2026-08-10T09:00:00+03:00", { companyId: "bplas", facilityId: "bplas-merkez" }),
  assignment("2", "2026-08-11T10:00:00+03:00", "2026-08-11T10:30:00+03:00", { companyId: "bplas", facilityId: "bplas-arge" }),
  assignment("3", "2026-08-12T12:00:00+03:00", "2026-08-12T13:00:00+03:00", { companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "CANCELLED" }),
]

describe("filterAssignmentsForReport", () => {
  it("applies the date-range and company/facility scope filters", () => {
    expect(ids(filterAssignmentsForReport(assignments, baseFilters))).toEqual(["3", "2", "1"])
    expect(ids(filterAssignmentsForReport(assignments, { ...baseFilters, startDate: "2026-08-11", endDate: "2026-08-12" }))).toEqual(["3", "2"])
    expect(ids(filterAssignmentsForReport(assignments, { ...baseFilters, companyId: "bplas-otomotiv" }))).toEqual(["3"])
    expect(ids(filterAssignmentsForReport(assignments, { ...baseFilters, facilityId: "bplas-arge" }))).toEqual(["2"])
  })

  it("returns an empty set for an inverted date range", () => {
    expect(filterAssignmentsForReport(assignments, { ...baseFilters, startDate: "2026-08-13", endDate: "2026-08-10" })).toEqual([])
  })

  it("sorts by planned start descending, most recent first", () => {
    expect(ids(filterAssignmentsForReport(assignments, baseFilters))).toEqual(["3", "2", "1"])
  })
})

describe("calculateFleetReportKpis", () => {
  it("computes totals, cancellation count/rate and average planned duration", () => {
    const kpis = calculateFleetReportKpis(assignments)
    expect(kpis.total).toBe(3)
    expect(kpis.cancelled).toBe(1)
    expect(kpis.cancelRate).toBeCloseTo(33.333, 2)
    expect(kpis.averagePlannedDurationMinutes).toBe(50)
  })

  it("reports zero rate and null average duration when there is no data", () => {
    expect(calculateFleetReportKpis([])).toEqual({ total: 0, cancelled: 0, cancelRate: 0, averagePlannedDurationMinutes: null })
  })
})

describe("getRelatedRecordLabel", () => {
  const meetings = [meeting("meeting-1", "Maya Kara")]
  const visits = [visit("visit-1", "Ayşe", "Test")]

  it("resolves a related meeting to a label with the host's name", () => {
    const withMeeting = assignment("x", "2026-08-10T08:00:00+03:00", "2026-08-10T09:00:00+03:00", { companyId: "bplas", facilityId: "bplas-merkez", relatedMeetingId: "meeting-1" })
    expect(getRelatedRecordLabel(withMeeting, meetings, visits)).toBe("Toplantı · Maya Kara")
  })

  it("resolves a related visit to a label with the visitor's name", () => {
    const withVisit = assignment("x", "2026-08-10T08:00:00+03:00", "2026-08-10T09:00:00+03:00", { companyId: "bplas", facilityId: "bplas-merkez", relatedVisitId: "visit-1" })
    expect(getRelatedRecordLabel(withVisit, meetings, visits)).toBe("Ziyaret · Ayşe Test")
  })

  it("returns an em dash when there is no related record or it cannot be found", () => {
    const none = assignment("x", "2026-08-10T08:00:00+03:00", "2026-08-10T09:00:00+03:00", { companyId: "bplas", facilityId: "bplas-merkez" })
    expect(getRelatedRecordLabel(none, meetings, visits)).toBe("—")

    const dangling = assignment("x", "2026-08-10T08:00:00+03:00", "2026-08-10T09:00:00+03:00", { companyId: "bplas", facilityId: "bplas-merkez", relatedMeetingId: "missing" })
    expect(getRelatedRecordLabel(dangling, meetings, visits)).toBe("—")
  })
})

describe("fleet report pagination", () => {
  it("paginates using the shared pagination helpers", () => {
    const records = Array.from({ length: 25 }, (_, index) => ({ id: String(index) }))
    expect(FLEET_REPORT_PAGE_SIZE).toBe(10)
    expect(getFleetReportPageCount(records.length)).toBe(3)
    expect(paginateFleetReport(records as PlannedTransportAssignment[], 1)).toHaveLength(10)
    expect(paginateFleetReport(records as PlannedTransportAssignment[], 3)).toHaveLength(5)
  })
})

function ids(records: PlannedTransportAssignment[]) {
  return records.map((record) => record.id)
}

function assignment(id: string, plannedStart: string, plannedEnd: string, overrides: {
  companyId: string
  facilityId: string
  status?: PlannedTransportAssignment["status"]
  relatedMeetingId?: string
  relatedVisitId?: string
}): PlannedTransportAssignment {
  return {
    id,
    companyId: overrides.companyId,
    companyName: overrides.companyId,
    facilityId: overrides.facilityId,
    facilityName: overrides.facilityId,
    plannedStart,
    plannedEnd,
    purpose: "Test görevi",
    vehicleResourceId: "vehicle-1",
    vehicleName: "Transit",
    vehicleLicensePlate: "16 BPL 101",
    driverResourceId: "driver-1",
    driverName: "Ayşe Demir",
    relatedMeetingId: overrides.relatedMeetingId,
    relatedVisitId: overrides.relatedVisitId,
    status: overrides.status ?? "ACTIVE",
    createdAt: plannedStart,
  }
}

function meeting(id: string, hostEmployeeName: string): Meeting {
  return {
    id,
    creatorEmployeeId: "creator-1",
    visitTypeId: "meeting",
    visitTypeName: "Toplantı",
    hostEmployeeId: "host-1",
    hostEmployeeName,
    hostCompanyId: "bplas",
    hostCompanyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: "2026-08-10T08:00:00+03:00",
    plannedEnd: "2026-08-10T09:00:00+03:00",
    hasAdditionalRequirements: false,
    createdAt: "2026-08-10T08:00:00+03:00",
    updatedAt: "2026-08-10T08:00:00+03:00",
  }
}

function visit(id: string, firstName: string, lastName: string): Visit {
  return {
    id,
    meetingId: `meeting-for-${id}`,
    creatorEmployeeId: "creator-1",
    visitor: { id: `visitor-${id}`, firstName, lastName, email: `${id}@example.com` },
    visitTypeId: "meeting",
    visitTypeName: "Toplantı",
    hostEmployeeId: "host-1",
    hostEmployeeName: "Maya Kara",
    hostCompanyId: "bplas",
    hostCompanyName: "BPLAS A.Ş.",
    facilityId: "bplas-merkez",
    facilityName: "Merkez Tesis",
    plannedStart: "2026-08-10T08:00:00+03:00",
    plannedEnd: "2026-08-10T09:00:00+03:00",
    status: "PLANNED",
    invitationStatus: "SENT",
    hasAdditionalRequirements: false,
    createdAt: "2026-08-10T08:00:00+03:00",
    updatedAt: "2026-08-10T08:00:00+03:00",
  }
}

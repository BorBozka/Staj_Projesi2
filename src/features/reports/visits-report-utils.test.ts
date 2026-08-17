import { describe, expect, it } from "vitest"

import type { Visit } from "@/domain/visits"
import type { ReportsScopeFilters } from "@/features/reports/reports-filters"
import {
  calculateVisitsReportKpis,
  filterVisitsForReport,
  getReportPageCount,
  getVisitDelayMinutes,
  paginateReportVisits,
  VISITS_REPORT_PAGE_SIZE,
} from "@/features/reports/visits-report-utils"
import { mockVisitReferenceData } from "@/services/mock-visit-data"

const baseFilters: ReportsScopeFilters = { startDate: "", endDate: "", companyId: "all", facilityId: "all" }

const visits = [
  visit("1", "2026-08-10T08:00:00+03:00", { firstName: "Ayşe", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara" }),
  visit("2", "2026-08-11T10:00:00+03:00", { firstName: "Bora", companyId: "bplas", facilityId: "bplas-arge", employeeId: "emre-yilmaz", invitationStatus: "FAILED" }),
  visit("3", "2026-08-12T12:00:00+03:00", { firstName: "Ceren", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", employeeId: "selin-aydin", status: "CHECKED_IN" }),
  visit("4", "2026-08-13T09:00:00+03:00", { firstName: "Deniz", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", invitationStatus: "NOT_SENT" }),
]

describe("filterVisitsForReport", () => {
  it("includes NOT_SENT invitations, unlike the All Visits operational list", () => {
    expect(ids(filterVisitsForReport(visits, baseFilters))).toEqual(expect.arrayContaining(["4"]))
    expect(filterVisitsForReport(visits, baseFilters)).toHaveLength(4)
  })

  it("applies the shared date-range and company/facility filters", () => {
    expect(ids(filterVisitsForReport(visits, { ...baseFilters, startDate: "2026-08-11", endDate: "2026-08-12" }))).toEqual(["3", "2"])
    expect(ids(filterVisitsForReport(visits, { ...baseFilters, companyId: "bplas-otomotiv" }))).toEqual(["3"])
    expect(ids(filterVisitsForReport(visits, { ...baseFilters, facilityId: "bplas-arge" }))).toEqual(["2"])
  })

  it("returns an empty set for an inverted date range", () => {
    expect(filterVisitsForReport(visits, { ...baseFilters, startDate: "2026-08-13", endDate: "2026-08-10" })).toEqual([])
  })

  it("sorts by planned start descending, most recent first", () => {
    expect(ids(filterVisitsForReport(visits, baseFilters))).toEqual(["4", "3", "2", "1"])
  })
})

describe("getVisitDelayMinutes", () => {
  it("returns null when the visitor never checked in", () => {
    expect(getVisitDelayMinutes(visit("x", "2026-08-10T08:00:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara" }))).toBeNull()
  })

  it("measures minutes late relative to planned start", () => {
    const late = visit("x", "2026-08-10T08:00:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", actualCheckIn: "2026-08-10T08:12:00+03:00" })
    expect(getVisitDelayMinutes(late)).toBe(12)
  })

  it("clamps early arrivals to zero instead of a negative delay", () => {
    const early = visit("x", "2026-08-10T08:00:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", actualCheckIn: "2026-08-10T07:45:00+03:00" })
    expect(getVisitDelayMinutes(early)).toBe(0)
  })
})

describe("calculateVisitsReportKpis", () => {
  it("computes totals, completion count, no-show/cancel rate and average duration", () => {
    const kpiVisits = [
      visit("a", "2026-08-10T08:00:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", status: "CHECKED_OUT", actualCheckIn: "2026-08-10T08:00:00+03:00", actualCheckOut: "2026-08-10T09:00:00+03:00" }),
      visit("b", "2026-08-10T08:00:00+03:00", { firstName: "B", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", status: "CHECKED_OUT", actualCheckIn: "2026-08-10T08:00:00+03:00", actualCheckOut: "2026-08-10T08:30:00+03:00" }),
      visit("c", "2026-08-10T08:00:00+03:00", { firstName: "C", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", status: "NO_SHOW" }),
      visit("d", "2026-08-10T08:00:00+03:00", { firstName: "D", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", status: "CANCELLED" }),
    ]
    const kpis = calculateVisitsReportKpis(kpiVisits)
    expect(kpis.total).toBe(4)
    expect(kpis.completed).toBe(2)
    expect(kpis.noShowCancelledRate).toBe(50)
    expect(kpis.averageDurationMinutes).toBe(45)
  })

  it("reports a null average duration and zero rate when there is no data", () => {
    expect(calculateVisitsReportKpis([])).toEqual({ total: 0, completed: 0, noShowCancelledRate: 0, averageDurationMinutes: null })
  })
})

describe("report pagination", () => {
  it("paginates using the shared pagination helpers", () => {
    const records = Array.from({ length: 25 }, (_, index) => ({ id: String(index) }))
    expect(VISITS_REPORT_PAGE_SIZE).toBe(10)
    expect(getReportPageCount(records.length)).toBe(3)
    expect(paginateReportVisits(records as Visit[], 1)).toHaveLength(10)
    expect(paginateReportVisits(records as Visit[], 3)).toHaveLength(5)
  })
})

function ids(records: Visit[]) {
  return records.map((record) => record.id)
}

function visit(id: string, plannedStart: string, overrides: {
  firstName: string
  companyId: string
  facilityId: string
  employeeId: string
  status?: Visit["status"]
  invitationStatus?: Visit["invitationStatus"]
  actualCheckIn?: string
  actualCheckOut?: string
}): Visit {
  const company = mockVisitReferenceData.companies.find((item) => item.id === overrides.companyId)!
  const facility = mockVisitReferenceData.facilities.find((item) => item.id === overrides.facilityId)!
  const employee = mockVisitReferenceData.employees.find((item) => item.id === overrides.employeeId)!
  const type = mockVisitReferenceData.visitTypes.find((item) => item.id === "meeting")!
  return {
    id,
    meetingId: `meeting-${id}`,
    creatorEmployeeId: "creator-1",
    visitor: { id: `visitor-${id}`, firstName: overrides.firstName, lastName: "Test", email: `${id}@example.com` },
    visitTypeId: type.id,
    visitTypeName: type.name,
    hostEmployeeId: employee.id,
    hostEmployeeName: employee.name,
    hostCompanyId: company.id,
    hostCompanyName: company.name,
    facilityId: facility.id,
    facilityName: facility.name,
    plannedStart,
    plannedEnd: plannedStart,
    status: overrides.status ?? "PLANNED",
    invitationStatus: overrides.invitationStatus ?? "SENT",
    hasAdditionalRequirements: false,
    actualCheckIn: overrides.actualCheckIn,
    actualCheckOut: overrides.actualCheckOut,
    createdAt: plannedStart,
    updatedAt: plannedStart,
  }
}

import { describe, expect, it } from "vitest"

import type { Visit } from "@/domain/visits"
import {
  ALL_VISITS_PAGE_SIZE,
  clearAllVisitsSearchParams,
  countVisitsWithAdditionalRequirements,
  filterAndSortVisits,
  getFacilitiesForCompany,
  getPageCount,
  paginateVisits,
  parseAllVisitsQuery,
  toggleVisitSort,
  updateAllVisitsSearchParams,
  type AllVisitsFilters,
  type VisitSort,
} from "@/features/manager/all-visits-utils"
import { mockVisitReferenceData } from "@/services/mock-visit-data"

const baseFilters: AllVisitsFilters = {
  search: "",
  startDate: "",
  endDate: "",
  companyId: "all",
  facilityId: "all",
  status: "all",
  visitTypeId: "all",
  hostEmployeeId: "all",
  invitationStatus: "all",
  additionalRequirement: "all",
}

const visits = [
  visit("1", "2026-08-10T08:00:00+03:00", { firstName: "Ayşe", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara" }),
  visit("2", "2026-08-11T10:00:00+03:00", { firstName: "Bora", companyId: "bplas", facilityId: "bplas-arge", employeeId: "emre-yilmaz", invitationStatus: "FAILED", hasAdditionalRequirements: true }),
  visit("3", "2026-08-12T12:00:00+03:00", { firstName: "Ceren", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", employeeId: "selin-aydin", status: "CHECKED_IN", typeId: "audit", hasAdditionalRequirements: true }),
]

describe("all visits operations", () => {
  it("searches visitor, host, company and facility values", () => {
    expect(ids(filterAndSortVisits(visits, { ...baseFilters, search: "Ayşe" }))).toEqual(["1"])
    expect(ids(filterAndSortVisits(visits, { ...baseFilters, search: "Emre" }))).toEqual(["2"])
    expect(ids(filterAndSortVisits(visits, { ...baseFilters, search: "Otomotiv" }))).toEqual(["3"])
    expect(ids(filterAndSortVisits(visits, { ...baseFilters, search: "Ar-Ge" }))).toEqual(["2"])
  })

  it("uses inclusive local start and end date boundaries", () => {
    expect(ids(filterAndSortVisits(visits, { ...baseFilters, startDate: "2026-08-11" }))).toEqual(["2", "3"])
    expect(ids(filterAndSortVisits(visits, { ...baseFilters, endDate: "2026-08-11" }))).toEqual(["1", "2"])
    expect(filterAndSortVisits(visits, { ...baseFilters, startDate: "2026-08-12", endDate: "2026-08-10" })).toEqual([])
  })

  it("keeps facilities within the selected company", () => {
    expect(getFacilitiesForCompany(mockVisitReferenceData, "bplas").map((facility) => facility.id)).toEqual(["bplas-merkez", "bplas-arge"])
    expect(parseAllVisitsQuery(new URLSearchParams("company=bplas&facility=otomotiv-uretim"), mockVisitReferenceData).filters.facilityId).toBe("all")
  })

  it("filters status, visit type, invitation and additional requirement independently", () => {
    expect(ids(filterAndSortVisits(visits, { ...baseFilters, status: "CHECKED_IN" }))).toEqual(["3"])
    expect(ids(filterAndSortVisits(visits, { ...baseFilters, visitTypeId: "audit" }))).toEqual(["3"])
    expect(ids(filterAndSortVisits(visits, { ...baseFilters, invitationStatus: "FAILED" }))).toEqual(["2"])
    expect(ids(filterAndSortVisits(visits, { ...baseFilters, additionalRequirement: "with" }))).toEqual(["2", "3"])
  })

  it("toggles visitor header through 1st: visitor asc, 2nd: visitor desc, 3rd: visitType asc, 4th: off", () => {
    let sorts: VisitSort[] = []

    // 1st click: visitor asc
    sorts = toggleVisitSort(sorts, "visitor")
    expect(sorts).toEqual([{ field: "visitor", direction: "asc" }])
    expect(ids(filterAndSortVisits(visits, baseFilters, sorts))).toEqual(["1", "2", "3"])

    // 2nd click: visitor desc
    sorts = toggleVisitSort(sorts, "visitor")
    expect(sorts).toEqual([{ field: "visitor", direction: "desc" }])
    expect(ids(filterAndSortVisits(visits, baseFilters, sorts))).toEqual(["3", "2", "1"])

    // 3rd click: visitType asc (sort by visit type for same visit type grouping)
    sorts = toggleVisitSort(sorts, "visitor")
    expect(sorts).toEqual([{ field: "visitType", direction: "asc" }])

    // 4th click: off (back to original table)
    sorts = toggleVisitSort(sorts, "visitor")
    expect(sorts).toEqual([])
  })

  it("toggles TAKİP header through 1st: invitation asc, 2nd: off (back to original table)", () => {
    let sorts: VisitSort[] = []

    // 1st click: invitation asc
    sorts = toggleVisitSort(sorts, "invitation")
    expect(sorts).toEqual([{ field: "invitation", direction: "asc" }])

    // 2nd click: off (directly returns to original table)
    sorts = toggleVisitSort(sorts, "invitation")
    expect(sorts).toEqual([])
  })

  it("calculates scope-aware count for visits with additional requirements", () => {
    // Total visits with additional requirements = 2 ("2" and "3")
    expect(countVisitsWithAdditionalRequirements(visits, baseFilters)).toBe(2)

    // Filtered by company "bplas" = only visit "2" has additional requirements
    expect(countVisitsWithAdditionalRequirements(visits, { ...baseFilters, companyId: "bplas" })).toBe(1)

    // Filtered by company "bplas-otomotiv" = only visit "3" has additional requirements
    expect(countVisitsWithAdditionalRequirements(visits, { ...baseFilters, companyId: "bplas-otomotiv" })).toBe(1)

    // Even when additionalRequirement is active ("with"), scope count remains stable (2)
    expect(countVisitsWithAdditionalRequirements(visits, { ...baseFilters, additionalRequirement: "with" })).toBe(2)
  })

  it("resets the page when a filter changes and clears known filters", () => {
    const changed = updateAllVisitsSearchParams(new URLSearchParams("page=3&status=PLANNED&custom=kept"), "company", "bplas")
    expect(changed.get("page")).toBeNull()
    expect(changed.get("company")).toBe("bplas")
    expect(changed.get("custom")).toBe("kept")
    expect(clearAllVisitsSearchParams(changed).toString()).toBe("custom=kept")
  })

  it("paginates 58 records into viewport-friendly pages", () => {
    const records = Array.from({ length: 58 }, (_, index) => ({ id: String(index) }))
    expect(ALL_VISITS_PAGE_SIZE).toBe(8)
    expect(getPageCount(records.length)).toBe(8)
    expect(paginateVisits(records as Visit[], 1)).toHaveLength(8)
    expect(paginateVisits(records as Visit[], 7)).toHaveLength(8)
    expect(paginateVisits(records as Visit[], 8)).toHaveLength(2)
  })

  it("supports legacy dashboard date/status params and ignores invalid values", () => {
    const legacy = parseAllVisitsQuery(new URLSearchParams("date=2026-08-11&status=PLANNED"), mockVisitReferenceData)
    expect(legacy.filters).toMatchObject({ startDate: "2026-08-11", endDate: "2026-08-11", status: "PLANNED" })

    const invalid = parseAllVisitsQuery(new URLSearchParams("date=bad&status=UNKNOWN&company=missing&page=-4"), mockVisitReferenceData)
    expect(invalid.filters).toMatchObject({ startDate: "", endDate: "", status: "all", companyId: "all" })
    expect(invalid.page).toBe(1)
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
  typeId?: string
  invitationStatus?: Visit["invitationStatus"]
  hasAdditionalRequirements?: boolean
}): Visit {
  const company = mockVisitReferenceData.companies.find((item) => item.id === overrides.companyId)!
  const facility = mockVisitReferenceData.facilities.find((item) => item.id === overrides.facilityId)!
  const employee = mockVisitReferenceData.employees.find((item) => item.id === overrides.employeeId)!
  const typeId = overrides.typeId ?? "meeting"
  const type = mockVisitReferenceData.visitTypes.find((item) => item.id === typeId)!
  return {
    id,
    meetingId: `meeting-${id}`,
    creatorEmployeeId: "creator-1",
    visitor: { id: `visitor-${id}`, firstName: overrides.firstName, lastName: "Test", email: `${id}@example.com` },
    visitTypeId: typeId,
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
    hasAdditionalRequirements: overrides.hasAdditionalRequirements ?? false,
    createdAt: plannedStart,
    updatedAt: plannedStart,
  }
}

import { describe, expect, it } from "vitest"

import { initialMockResources } from "@/services/mock-resource-data"
import {
  defaultResourceFilters,
  filterResources,
  getResourcePageCount,
  getVisibleResourcePageNumbers,
  paginateResources,
  RESOURCE_PAGE_SIZE,
  sortResources,
  toggleResourceSort,
} from "@/features/resources/resource-filters"

describe("resource catalog filters", () => {
  it("combines company, facility, type, and active filters", () => {
    const result = filterResources(initialMockResources, {
      ...defaultResourceFilters,
      companyId: "bplas",
      facilityId: "bplas-arge",
      type: "POOLED_EQUIPMENT",
      active: "inactive",
    })

    expect(result.map((resource) => resource.id)).toEqual(["resource-projector-arge"])
  })

  it("filters resources by search query across name, company, facility, and details", () => {
    expect(filterResources(initialMockResources, { ...defaultResourceFilters, search: "Transit" }).map((resource) => resource.id)).toEqual(["resource-vehicle-transit-merkez"])
    expect(filterResources(initialMockResources, { ...defaultResourceFilters, search: "Ayşe" }).map((resource) => resource.id)).toEqual(["resource-driver-ayse-demir"])
  })

  it("returns every resource for default filters", () => {
    expect(filterResources(initialMockResources, defaultResourceFilters)).toHaveLength(initialMockResources.length)
  })

  it("sorts resources in ascending groups by the selected column", () => {
    expect(sortResources(initialMockResources, [{ field: "type", direction: "asc" }]).map((resource) => resource.type)).toEqual([
      ...Array.from({ length: 10 }, () => "DRIVER"),
      ...Array.from({ length: 3 }, () => "POOLED_EQUIPMENT"),
      ...Array.from({ length: 2 }, () => "ROOM"),
      ...Array.from({ length: 10 }, () => "VEHICLE"),
    ])
    expect(sortResources(initialMockResources, [{ field: "status", direction: "asc" }]).map((resource) => resource.isActive)).toEqual([false, false, ...Array.from({ length: 23 }, () => true)])
  })

  it("cycles individual sorts without clearing other sort fields", () => {
    const first = toggleResourceSort([], "type")
    const second = toggleResourceSort(first, "status")
    const third = toggleResourceSort(second, "type")

    expect(first).toEqual([{ field: "type", direction: "asc" }])
    expect(second).toEqual([{ field: "type", direction: "asc" }, { field: "status", direction: "asc" }])
    expect(third).toEqual([{ field: "type", direction: "desc" }, { field: "status", direction: "asc" }])
    expect(toggleResourceSort(third, "type")).toEqual([{ field: "status", direction: "asc" }])
  })

  it("uses later active sorts inside equal primary-column groups", () => {
    const room = initialMockResources.find((resource) => resource.type === "ROOM")!
    const equipment = initialMockResources.find((resource) => resource.type === "POOLED_EQUIPMENT")!
    const resources = [
      { ...room, id: "room-active", isActive: true },
      { ...room, id: "room-inactive", isActive: false },
      { ...equipment, id: "equipment-active", isActive: true },
    ]

    expect(sortResources(resources, [
      { field: "type", direction: "asc" },
      { field: "status", direction: "asc" },
    ]).map((resource) => resource.id)).toEqual(["equipment-active", "room-inactive", "room-active"])
  })

  it.each([
    { type: "VEHICLE" as const, ids: ["resource-vehicle-transit-merkez", "resource-vehicle-megane-otomotiv", "resource-vehicle-sprinter-merkez", "resource-vehicle-courier-merkez", "resource-vehicle-daily-merkez", "resource-vehicle-kangoo-merkez", "resource-vehicle-doblo-merkez", "resource-vehicle-master-merkez", "resource-vehicle-transporter-arge", "resource-vehicle-proace-otomotiv"] },
    { type: "DRIVER" as const, ids: ["resource-driver-ayse-demir", "resource-driver-mehmet-kaya", "resource-driver-zeynep-arslan", "resource-driver-burak-cetin", "resource-driver-selin-yildiz", "resource-driver-emre-aksoy", "resource-driver-hakan-yalcin", "resource-driver-elif-sahin", "resource-driver-can-ozdemir", "resource-driver-deniz-gok"] },
  ])("filters $type resources", ({ type, ids }) => {
    expect(filterResources(initialMockResources, { ...defaultResourceFilters, type }).map((resource) => resource.id)).toEqual(ids)
  })

  it("combines organization, driver type, and active status filters", () => {
    const result = filterResources(initialMockResources, {
      ...defaultResourceFilters,
      companyId: "bplas",
      facilityId: "bplas-merkez",
      type: "DRIVER",
      active: "active",
    })

    expect(result.map((resource) => resource.id)).toEqual(["resource-driver-ayse-demir", "resource-driver-zeynep-arslan", "resource-driver-burak-cetin", "resource-driver-selin-yildiz", "resource-driver-emre-aksoy", "resource-driver-hakan-yalcin", "resource-driver-elif-sahin"])
  })

  it.each([
    { total: 0, expected: 1 },
    { total: 1, expected: 1 },
    { total: 8, expected: 1 },
    { total: 9, expected: 1 },
    { total: 28, expected: 4 },
  ])("calculates a viewport-friendly page count for $total resources", ({ total, expected }) => {
    expect(RESOURCE_PAGE_SIZE).toBe(9)
    expect(getResourcePageCount(total)).toBe(expected)
  })

  it("paginates resources and limits the visible page controls", () => {
    const resources = Array.from({ length: 20 }, (_, index) => ({
      ...initialMockResources[index % initialMockResources.length],
      id: `resource-${index}`,
    }))

    expect(paginateResources(resources, 1)).toHaveLength(9)
    expect(paginateResources(resources, 3)).toHaveLength(2)
    expect(getVisibleResourcePageNumbers(3, 5)).toEqual([2, 3, 4])
  })
})

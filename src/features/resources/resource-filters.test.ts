import { describe, expect, it } from "vitest"

import { initialMockResources } from "@/services/mock-resource-data"
import { defaultResourceFilters, filterResources } from "@/features/resources/resource-filters"

describe("resource catalog filters", () => {
  it("combines company, facility, type, and active filters", () => {
    const result = filterResources(initialMockResources, {
      companyId: "bplas",
      facilityId: "bplas-arge",
      type: "POOLED_EQUIPMENT",
      active: "inactive",
    })

    expect(result.map((resource) => resource.id)).toEqual(["resource-projector-arge"])
  })

  it("returns every resource for default filters", () => {
    expect(filterResources(initialMockResources, defaultResourceFilters)).toHaveLength(initialMockResources.length)
  })
})

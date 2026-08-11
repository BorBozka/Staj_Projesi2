import type { FacilityResource, ResourceType } from "@/domain/resources"

export interface ResourceFilters {
  companyId: string
  facilityId: string
  type: "all" | ResourceType
  active: "all" | "active" | "inactive"
}

export const defaultResourceFilters: ResourceFilters = {
  companyId: "all",
  facilityId: "all",
  type: "all",
  active: "all",
}

export function filterResources(resources: FacilityResource[], filters: ResourceFilters) {
  return resources.filter((resource) => {
    if (filters.companyId !== "all" && resource.companyId !== filters.companyId) return false
    if (filters.facilityId !== "all" && resource.facilityId !== filters.facilityId) return false
    if (filters.type !== "all" && resource.type !== filters.type) return false
    if (filters.active === "active" && !resource.isActive) return false
    if (filters.active === "inactive" && resource.isActive) return false
    return true
  })
}

export function hasActiveResourceFilters(filters: ResourceFilters) {
  return Object.values(filters).some((value) => value !== "all")
}

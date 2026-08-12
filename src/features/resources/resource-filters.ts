import type { FacilityResource, ResourceType } from "@/domain/resources"

export const RESOURCE_PAGE_SIZE = 9

export type ResourceSortField = "name" | "type" | "location" | "quantity" | "status"
export type SortDirection = "asc" | "desc"
export interface ResourceSort {
  field: ResourceSortField
  direction: SortDirection
}

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

export function sortResources(resources: FacilityResource[], sorts: ResourceSort[]) {
  if (sorts.length === 0) return resources

  return [...resources].sort((left, right) => {
    for (const sort of sorts) {
      const result = compareResources(left, right, sort.field)
      if (result !== 0) return sort.direction === "asc" ? result : -result
    }
    return 0
  })
}

export function toggleResourceSort(sorts: ResourceSort[], field: ResourceSortField) {
  const existing = sorts.find((sort) => sort.field === field)
  if (!existing) return [...sorts, { field, direction: "asc" as const }]
  if (existing.direction === "asc") return sorts.map((sort) => sort.field === field ? { ...sort, direction: "desc" as const } : sort)
  return sorts.filter((sort) => sort.field !== field)
}

function compareResources(left: FacilityResource, right: FacilityResource, sortField: ResourceSortField) {
  switch (sortField) {
    case "name":
      return getResourceName(left).localeCompare(getResourceName(right), "tr")
        || left.type.localeCompare(right.type, "tr")
    case "type":
      return left.type.localeCompare(right.type, "tr")
        || getResourceName(left).localeCompare(getResourceName(right), "tr")
    case "location":
      return left.companyName.localeCompare(right.companyName, "tr")
        || left.facilityName.localeCompare(right.facilityName, "tr")
        || getResourceName(left).localeCompare(getResourceName(right), "tr")
    case "quantity":
      return getQuantity(left) - getQuantity(right)
        || getResourceName(left).localeCompare(getResourceName(right), "tr")
    case "status":
      return Number(left.isActive) - Number(right.isActive)
        || getResourceName(left).localeCompare(getResourceName(right), "tr")
  }
}

export function hasActiveResourceFilters(filters: ResourceFilters) {
  return Object.values(filters).some((value) => value !== "all")
}

export function paginateResources(resources: FacilityResource[], page: number, pageSize = RESOURCE_PAGE_SIZE) {
  const start = (page - 1) * pageSize
  return resources.slice(start, start + pageSize)
}

export function getResourcePageCount(total: number, pageSize = RESOURCE_PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize))
}

export function getVisibleResourcePageNumbers(page: number, pageCount: number) {
  const start = Math.max(1, Math.min(page - 1, pageCount - 2))
  return Array.from({ length: Math.min(3, pageCount) }, (_, index) => start + index)
}

function getResourceName(resource: FacilityResource) {
  return resource.type === "VEHICLE"
    ? `${resource.brand} ${resource.model}`
    : resource.type === "DRIVER"
      ? resource.fullName
      : resource.name
}

function getQuantity(resource: FacilityResource) {
  return resource.type === "POOLED_EQUIPMENT" ? resource.totalQuantity : 0
}

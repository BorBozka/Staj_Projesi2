import type { FacilityResource, ResourceType } from "@/domain/resources"
import { getPageCount, paginate } from "@/lib/pagination"
import { toggleSort } from "@/lib/sort"

export const RESOURCE_PAGE_SIZE = 9

export type ResourceSortField = "name" | "type" | "location" | "quantity" | "status"
export type SortDirection = "asc" | "desc"
export interface ResourceSort {
  field: ResourceSortField
  direction: SortDirection
}

export interface ResourceFilters {
  search: string
  companyId: string
  facilityId: string
  type: "all" | ResourceType
  active: "all" | "active" | "inactive"
}

export const defaultResourceFilters: ResourceFilters = {
  search: "",
  companyId: "all",
  facilityId: "all",
  type: "all",
  active: "all",
}

export function filterResources(resources: FacilityResource[], filters: ResourceFilters) {
  const searchQuery = filters.search.trim().toLowerCase()

  return resources.filter((resource) => {
    if (filters.companyId !== "all" && resource.companyId !== filters.companyId) return false
    if (filters.facilityId !== "all" && resource.facilityId !== filters.facilityId) return false
    if (filters.type !== "all" && resource.type !== filters.type) return false
    if (filters.active === "active" && !resource.isActive) return false
    if (filters.active === "inactive" && resource.isActive) return false

    if (searchQuery) {
      const name = getResourceName(resource).toLowerCase()
      const company = resource.companyName.toLowerCase()
      const facility = resource.facilityName.toLowerCase()
      const detail = (getResourceDetail(resource) ?? "").toLowerCase()
      const matches = name.includes(searchQuery) || company.includes(searchQuery) || facility.includes(searchQuery) || detail.includes(searchQuery)
      if (!matches) return false
    }

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
  return toggleSort(sorts, field)
}

function compareResources(left: FacilityResource, right: FacilityResource, sortField: ResourceSortField) {
  switch (sortField) {
    case "name":
      return getResourceName(left).localeCompare(getResourceName(right), "tr", { numeric: true, sensitivity: "base" })
    case "type":
      return left.type.localeCompare(right.type, "tr")
    case "location":
      return left.companyName.localeCompare(right.companyName, "tr")
        || left.facilityName.localeCompare(right.facilityName, "tr")
    case "quantity":
      return getQuantity(left) - getQuantity(right)
    case "status":
      return Number(left.isActive) - Number(right.isActive)
  }
}

export function hasActiveResourceFilters(filters: ResourceFilters) {
  return (
    filters.search.trim() !== "" ||
    filters.companyId !== "all" ||
    filters.facilityId !== "all" ||
    filters.type !== "all" ||
    filters.active !== "all"
  )
}

export function paginateResources(resources: FacilityResource[], page: number, pageSize = RESOURCE_PAGE_SIZE) {
  return paginate(resources, page, pageSize)
}

export function getResourcePageCount(total: number, pageSize = RESOURCE_PAGE_SIZE) {
  return getPageCount(total, pageSize)
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

function getResourceDetail(resource: FacilityResource) {
  switch (resource.type) {
    case "VEHICLE":
      return resource.licensePlate
    case "DRIVER":
      return resource.licenseClasses.join(", ") || null
    default:
      return null
  }
}

function getQuantity(resource: FacilityResource) {
  return resource.type === "POOLED_EQUIPMENT" ? resource.totalQuantity : 0
}

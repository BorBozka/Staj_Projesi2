import { endOfDay, format, isAfter, isValid, parse, startOfDay } from "date-fns"

import {
  visitStatusLabels,
  visitStatuses,
  type Visit,
  type VisitReferenceData,
  type VisitStatus,
} from "@/domain/visits"
import { getPageCount as getPageCountShared, paginate } from "@/lib/pagination"
import { toggleSort } from "@/lib/sort"

// Keeps the complete list, filters and pagination controls within a standard laptop viewport.
export const ALL_VISITS_PAGE_SIZE = 9

export type AdditionalRequirementFilter = "all" | "with" | "without"
export type VisitSortField = "visitor" | "visitorCompany" | "visitType" | "host" | "companyFacility" | "plannedStart" | "status"
export type VisitSortDirection = "asc" | "desc"

export interface VisitSort {
  field: VisitSortField
  direction: VisitSortDirection
}

export interface AllVisitsFilters {
  search: string
  startDate: string
  endDate: string
  companyId: string
  facilityId: string
  status: "all" | VisitStatus
  visitTypeId: string
  hostEmployeeId: string
  additionalRequirement: AdditionalRequirementFilter
}

export interface AllVisitsQueryState {
  filters: AllVisitsFilters
  page: number
  showOtherFilters: boolean
}

const knownParameters = [
  "q",
  "from",
  "to",
  "date",
  "company",
  "facility",
  "status",
  "type",
  "host",
  "invitation",
  "additional",
  "page",
  "more",
] as const

export function parseAllVisitsQuery(searchParams: URLSearchParams, referenceData: VisitReferenceData): AllVisitsQueryState {
  const legacyDate = parseDateParameter(searchParams.get("date"))
  const explicitStart = parseDateParameter(searchParams.get("from"))
  const explicitEnd = parseDateParameter(searchParams.get("to"))
  const companyParam = searchParams.get("company")
  const companyId = referenceData.companies.some((company) => company.id === companyParam) ? companyParam! : "all"
  const facilityParam = searchParams.get("facility")
  const facility = referenceData.facilities.find((item) => item.id === facilityParam)
  const facilityId = facility && (companyId === "all" || facility.companyId === companyId) ? facility.id : "all"
  const statusParam = searchParams.get("status")
  const additionalParam = searchParams.get("additional")
  const visitTypeParam = searchParams.get("type")
  const hostParam = searchParams.get("host")
  const pageParam = Number(searchParams.get("page"))

  return {
    filters: {
      search: searchParams.get("q") ?? "",
      startDate: explicitStart ?? (!explicitStart && !explicitEnd ? legacyDate ?? "" : ""),
      endDate: explicitEnd ?? (!explicitStart && !explicitEnd ? legacyDate ?? "" : ""),
      companyId,
      facilityId,
      status: visitStatuses.includes(statusParam as VisitStatus) ? statusParam as VisitStatus : "all",
      visitTypeId: referenceData.visitTypes.some((type) => type.id === visitTypeParam) ? visitTypeParam! : "all",
      hostEmployeeId: referenceData.employees.some((employee) => employee.id === hostParam) ? hostParam! : "all",
      additionalRequirement: additionalParam === "with" || additionalParam === "without" ? additionalParam : "all",
    },
    page: Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1,
    showOtherFilters: searchParams.get("more") === "1",
  }
}

export function toggleVisitSort(sorts: VisitSort[], field: VisitSortField): VisitSort[] {
  return toggleSort(sorts, field)
}

export function sortVisits(visits: Visit[], sorts: VisitSort[]): Visit[] {
  if (sorts.length === 0) return visits

  return [...visits].sort((left, right) => {
    for (const sort of sorts) {
      const result = compareVisits(left, right, sort.field)
      if (result !== 0) return sort.direction === "asc" ? result : -result
    }
    return 0
  })
}

export function updateAllVisitsSearchParams(current: URLSearchParams, key: string, value: string) {
  const next = new URLSearchParams(current)
  if (!value || value === "all") next.delete(key)
  else next.set(key, value)
  if (key === "company") next.delete("facility")
  if (key === "from" || key === "to") next.delete("date")
  next.delete("page")
  return next
}

export function setAllVisitsRange(current: URLSearchParams, startDate: string, endDate: string) {
  const next = new URLSearchParams(current)
  next.delete("date")
  if (startDate) next.set("from", startDate)
  else next.delete("from")
  if (endDate) next.set("to", endDate)
  else next.delete("to")
  next.delete("page")
  return next
}

export function clearAllVisitsSearchParams(current: URLSearchParams) {
  const next = new URLSearchParams(current)
  knownParameters.forEach((parameter) => next.delete(parameter))
  return next
}

export function getFacilitiesForCompany(referenceData: VisitReferenceData, companyId: string) {
  return referenceData.facilities.filter((facility) => companyId === "all" || facility.companyId === companyId)
}

export function hasActiveAllVisitsFilters(filters: AllVisitsFilters) {
  return Boolean(
    filters.search.trim()
      || filters.startDate
      || filters.endDate
      || filters.companyId !== "all"
      || filters.facilityId !== "all"
      || filters.status !== "all"
      || filters.visitTypeId !== "all"
      || filters.hostEmployeeId !== "all"
      || filters.additionalRequirement !== "all",
  )
}

export function isDateRangeInvalid(filters: Pick<AllVisitsFilters, "startDate" | "endDate">) {
  if (!filters.startDate || !filters.endDate) return false
  return isAfter(toLocalDate(filters.startDate), toLocalDate(filters.endDate))
}

function compareTr(left: string, right: string): number {
  return left.localeCompare(right, "tr-TR", { sensitivity: "base" })
}

function compareVisits(left: Visit, right: Visit, field: VisitSortField): number {
  switch (field) {
    case "visitor": {
      const leftName = `${left.visitor.firstName} ${left.visitor.lastName}`
      const rightName = `${right.visitor.firstName} ${right.visitor.lastName}`
      return compareTr(leftName, rightName)
    }
    case "visitorCompany":
      return compareTr(left.visitor.company, right.visitor.company)
    case "visitType": {
      return compareTr(left.visitTypeName, right.visitTypeName)
    }
    case "host":
      return compareTr(left.hostEmployeeName, right.hostEmployeeName)
    case "companyFacility": {
      const leftCf = `${left.hostCompanyName} ${left.facilityName}`
      const rightCf = `${right.hostCompanyName} ${right.facilityName}`
      return compareTr(leftCf, rightCf)
    }
    case "plannedStart":
      return new Date(left.plannedStart).getTime() - new Date(right.plannedStart).getTime()
    case "status":
      return compareTr(visitStatusLabels[left.status], visitStatusLabels[right.status])
    default:
      return 0
  }
}

// Shared filter core: every AllVisitsFilters predicate except invitation-state visibility,
// which differs between the operational All Visits list and reporting surfaces (see filterAndSortVisits vs. Reports).
export function filterVisits(visits: Visit[], filters: AllVisitsFilters): Visit[] {
  if (isDateRangeInvalid(filters)) return []

  const query = filters.search.trim().toLocaleLowerCase("tr-TR")
  const rangeStart = filters.startDate ? startOfDay(toLocalDate(filters.startDate)) : null
  const rangeEnd = filters.endDate ? endOfDay(toLocalDate(filters.endDate)) : null

  return visits.filter((visit) => {
    const plannedStart = new Date(visit.plannedStart)
    const searchableText = [
      visit.visitor.firstName,
      visit.visitor.lastName,
      visit.visitTypeName,
      visit.hostEmployeeName,
      visit.hostCompanyName,
      visit.facilityName,
    ].join(" ").toLocaleLowerCase("tr-TR")
    const additionalMatches = filters.additionalRequirement === "all"
      || (filters.additionalRequirement === "with" && Boolean(visit.hasAdditionalRequirements))
      || (filters.additionalRequirement === "without" && !visit.hasAdditionalRequirements)

    return (!query || searchableText.includes(query))
      && (!rangeStart || plannedStart >= rangeStart)
      && (!rangeEnd || plannedStart <= rangeEnd)
      && (filters.companyId === "all" || visit.hostCompanyId === filters.companyId)
      && (filters.facilityId === "all" || visit.facilityId === filters.facilityId)
      && (filters.status === "all" || visit.status === filters.status)
      && (filters.visitTypeId === "all" || visit.visitTypeId === filters.visitTypeId)
      && (filters.hostEmployeeId === "all" || visit.hostEmployeeId === filters.hostEmployeeId)
      && additionalMatches
  })
}

export function filterAndSortVisits(visits: Visit[], filters: AllVisitsFilters, sorts: VisitSort[] = []) {
  const operationallyOpened = filterVisits(visits, filters).filter((visit) => visit.invitationStatus !== "NOT_SENT")
  return sortVisits(operationallyOpened, sorts)
}

export function countVisitsWithAdditionalRequirements(visits: Visit[], filters: AllVisitsFilters): number {
  const scopeFilters: AllVisitsFilters = {
    ...filters,
    additionalRequirement: "all",
  }
  const scopeVisits = filterAndSortVisits(visits, scopeFilters)
  return scopeVisits.filter((visit) => Boolean(visit.hasAdditionalRequirements)).length
}

export function paginateVisits(visits: Visit[], page: number, pageSize = ALL_VISITS_PAGE_SIZE) {
  return paginate(visits, page, pageSize)
}

export function getPageCount(total: number, pageSize = ALL_VISITS_PAGE_SIZE) {
  return getPageCountShared(total, pageSize)
}

export function getVisiblePageNumbers(page: number, pageCount: number) {
  const start = Math.max(1, Math.min(page - 1, pageCount - 2))
  return Array.from({ length: Math.min(3, pageCount) }, (_, index) => start + index)
}

function parseDateParameter(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = parse(value, "yyyy-MM-dd", new Date())
  return isValid(parsed) && format(parsed, "yyyy-MM-dd") === value ? value : null
}

function toLocalDate(value: string) {
  return parse(value, "yyyy-MM-dd", new Date())
}

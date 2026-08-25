import { addDays, differenceInCalendarDays, format, isValid, parse, subDays, subYears } from "date-fns"

import type { VisitReferenceData } from "@/domain/visits"
import { getQuickDateRangeOptions, matchesQuickDateRange, type QuickDateRangeKey, type QuickDateRangeOption } from "@/lib/quick-date-range"

export const reportTabs = ["visits", "vehicle", "goods"] as const
export type ReportTab = (typeof reportTabs)[number]
export const reportViews = ["analysis", "records"] as const
export type ReportView = (typeof reportViews)[number]
export const reportComparisonModes = ["none", "previous", "previous-year", "custom"] as const
export type ReportComparisonMode = (typeof reportComparisonModes)[number]
export const reportGranularities = ["daily", "weekly"] as const
export type ReportGranularity = (typeof reportGranularities)[number]

const REPORTS_SESSION_SEARCH_KEY = "manager-reports-search"

export interface ReportsScopeFilters {
  startDate: string
  endDate: string
  companyId: string
  facilityId: string
}

export interface ReportsQueryState {
  tab: ReportTab
  filters: ReportsScopeFilters
  view: ReportView
  page: number
  comparison: ReportComparisonMode
  compareFrom: string | null
  compareTo: string | null
  granularity: ReportGranularity
}

export type QuickRangeKey = QuickDateRangeKey
export type QuickRangeOption = QuickDateRangeOption

const isoDate = (date: Date) => format(date, "yyyy-MM-dd")

// Reports are historical analysis only — no filter or quick range may reach past today.
export function getMaxEndDate(now: Date): string {
  return isoDate(now)
}

export function getQuickRangeOptions(now: Date): QuickRangeOption[] {
  return getQuickDateRangeOptions(now)
}

export function getDefaultReportsRange(now: Date): Pick<ReportsScopeFilters, "startDate" | "endDate"> {
  const option = getQuickRangeOptions(now).find((item) => item.key === "30d")!
  return { startDate: option.startDate, endDate: option.endDate }
}

export function parseReportsQuery(searchParams: URLSearchParams, referenceData: VisitReferenceData, now: Date): ReportsQueryState {
  const tabParam = searchParams.get("tab")
  const tab: ReportTab = reportTabs.includes(tabParam as ReportTab) ? (tabParam as ReportTab) : "visits"

  const fromParam = parseDateParameter(searchParams.get("from"))
  const rawToParam = parseDateParameter(searchParams.get("to"))
  const maxEndDate = getMaxEndDate(now)
  // Clamp here (the single source of truth for `filters`) rather than only in the date-picker's
  // onChange, so a hand-edited URL or bookmark can't sneak a future end date into the analysis.
  const toParam = rawToParam && rawToParam > maxEndDate ? maxEndDate : rawToParam
  const hasExplicitRange = Boolean(fromParam || toParam)
  const defaultRange = getDefaultReportsRange(now)

  const companyParam = searchParams.get("company")
  const companyId = referenceData.companies.some((company) => company.id === companyParam) ? companyParam! : "all"
  const facilityParam = searchParams.get("facility")
  const facility = referenceData.facilities.find((item) => item.id === facilityParam)
  const facilityId = facility && (companyId === "all" || facility.companyId === companyId) ? facility.id : "all"
  const view: ReportView = tab === "visits" && searchParams.get("view") === "records" ? "records" : "analysis"
  const comparisonParam = searchParams.get("comparison")
  const requestedComparison: ReportComparisonMode = reportComparisonModes.includes(comparisonParam as ReportComparisonMode) ? comparisonParam as ReportComparisonMode : "none"
  const granularity: ReportGranularity = searchParams.get("granularity") === "weekly" ? "weekly" : "daily"

  const reportRange = { startDate: hasExplicitRange ? fromParam ?? "" : defaultRange.startDate, endDate: hasExplicitRange ? toParam ?? "" : defaultRange.endDate }
  const comparisonPeriod = getComparisonPeriod(reportRange, requestedComparison, searchParams.get("compareFrom"))
  // A custom comparison only exists once its equal-length range can be derived. This rejects
  // hand-authored or interrupted `comparison=custom` URLs as safely as the UI avoids creating them.
  const comparison: ReportComparisonMode = requestedComparison === "custom" && !comparisonPeriod ? "none" : requestedComparison
  return {
    tab,
    view,
    page: parsePageParameter(searchParams.get("page")),
    comparison,
    compareFrom: comparisonPeriod?.startDate ?? null,
    compareTo: comparisonPeriod?.endDate ?? null,
    granularity,
    filters: {
      ...reportRange,
      companyId,
      facilityId,
    },
  }
}

export function updateReportsSearchParams(current: URLSearchParams, key: string, value: string) {
  const next = new URLSearchParams(current)
  if (!value || value === "all") next.delete(key)
  else next.set(key, value)
  if (key === "company") next.delete("facility")
  next.delete("page")
  return next
}

export function setReportsTab(current: URLSearchParams, tab: ReportTab) {
  const next = new URLSearchParams(current)
  if (tab === "visits") next.delete("tab")
  else next.set("tab", tab)
  return next
}

export function setReportsRange(current: URLSearchParams, startDate: string, endDate: string) {
  const next = new URLSearchParams(current)
  if (startDate) next.set("from", startDate)
  else next.delete("from")
  if (endDate) next.set("to", endDate)
  else next.delete("to")
  next.delete("page")
  return next
}

export function setReportsView(current: URLSearchParams, view: ReportView) {
  const next = new URLSearchParams(current)
  if (view === "analysis") next.delete("view")
  else next.set("view", view)
  next.delete("page")
  return next
}

export function setReportsPage(current: URLSearchParams, page: number) {
  const next = new URLSearchParams(current)
  if (page <= 1) next.delete("page")
  else next.set("page", String(Math.floor(page)))
  return next
}

export function setReportsComparison(current: URLSearchParams, comparison: ReportComparisonMode) {
  const next = new URLSearchParams(current)
  if (comparison === "none") next.delete("comparison")
  else next.set("comparison", comparison)
  if (comparison !== "custom") {
    next.delete("compareFrom")
    next.delete("compareTo")
  }
  return next
}

export function setReportsCustomComparison(current: URLSearchParams, filters: Pick<ReportsScopeFilters, "startDate" | "endDate">, compareFrom: string) {
  const period = getComparisonPeriod(filters, "custom", compareFrom)
  // Do not manufacture an incomplete custom comparison. The caller may be holding a date
  // field draft, but URL state remains the previously committed comparison until it is valid.
  if (!period) return new URLSearchParams(current)
  const next = setReportsComparison(current, "custom")
  next.set("compareFrom", period.startDate)
  next.set("compareTo", period.endDate)
  next.delete("page")
  return next
}

export function setReportsGranularity(current: URLSearchParams, granularity: ReportGranularity) {
  const next = new URLSearchParams(current)
  if (granularity === "daily") next.delete("granularity")
  else next.set("granularity", granularity)
  return next
}

export function resetReportsFilters(current: URLSearchParams) {
  const next = new URLSearchParams(current)
  for (const key of ["from", "to", "company", "facility", "page", "comparison", "compareFrom", "compareTo", "granularity"]) {
    next.delete(key)
  }
  return next
}

export function saveReportsSearch(searchParams: URLSearchParams) {
  if (typeof window === "undefined") return
  const value = searchParams.toString()
  if (value) window.sessionStorage.setItem(REPORTS_SESSION_SEARCH_KEY, value)
  else window.sessionStorage.removeItem(REPORTS_SESSION_SEARCH_KEY)
}

export function getSavedReportsHref() {
  if (typeof window === "undefined") return "/manager/reports"
  const value = window.sessionStorage.getItem(REPORTS_SESSION_SEARCH_KEY)
  return value ? `/manager/reports?${value}` : "/manager/reports"
}

export function matchesQuickRange(filters: Pick<ReportsScopeFilters, "startDate" | "endDate">, option: QuickRangeOption) {
  return matchesQuickDateRange(filters, option)
}

// The immediately preceding period of the same length, e.g. 10–19 Aug (10 days) compares against
// 31 Jul–9 Aug. Returns null for an open-ended or inverted range, since neither has a natural
// length to mirror.
export function getPreviousPeriod(filters: Pick<ReportsScopeFilters, "startDate" | "endDate">): { startDate: string; endDate: string } | null {
  if (!filters.startDate || !filters.endDate) return null
  const start = parse(filters.startDate, "yyyy-MM-dd", new Date())
  const end = parse(filters.endDate, "yyyy-MM-dd", new Date())
  if (start > end) return null

  const lengthDays = differenceInCalendarDays(end, start) + 1
  const previousEnd = subDays(start, 1)
  const previousStart = subDays(previousEnd, lengthDays - 1)
  return { startDate: isoDate(previousStart), endDate: isoDate(previousEnd) }
}

function parseDateParameter(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

// Shared comparison range model for every report surface. All ranges are inclusive, so custom
// ranges deliberately inherit the selected period's exact day count.
export function getComparisonPeriod(filters: Pick<ReportsScopeFilters, "startDate" | "endDate">, mode: ReportComparisonMode, customStart?: string | null): { startDate: string; endDate: string } | null {
  if (mode === "none") return null
  if (mode === "previous") return getPreviousPeriod(filters)
  if (!filters.startDate || !filters.endDate) return null
  const start = parse(filters.startDate, "yyyy-MM-dd", new Date())
  const end = parse(filters.endDate, "yyyy-MM-dd", new Date())
  if (!isValid(start) || !isValid(end) || start > end) return null
  if (mode === "previous-year") return { startDate: isoDate(subYears(start, 1)), endDate: isoDate(subYears(end, 1)) }
  if (!customStart || !/^\d{4}-\d{2}-\d{2}$/.test(customStart)) return null
  const custom = parse(customStart, "yyyy-MM-dd", new Date())
  if (!isValid(custom)) return null
  return { startDate: isoDate(custom), endDate: isoDate(addDays(custom, differenceInCalendarDays(end, start))) }
}

function parsePageParameter(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return 1
  const page = Number(value)
  return Number.isSafeInteger(page) && page > 0 ? page : 1
}

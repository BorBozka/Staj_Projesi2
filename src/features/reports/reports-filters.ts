import { endOfMonth, format, startOfMonth, subDays } from "date-fns"

import type { VisitReferenceData } from "@/domain/visits"

export const reportTabs = ["visits", "vehicle", "goods"] as const
export type ReportTab = (typeof reportTabs)[number]

export interface ReportsScopeFilters {
  startDate: string
  endDate: string
  companyId: string
  facilityId: string
}

export interface ReportsQueryState {
  tab: ReportTab
  filters: ReportsScopeFilters
}

export type QuickRangeKey = "today" | "7d" | "30d" | "month"

export interface QuickRangeOption {
  key: QuickRangeKey
  label: string
  startDate: string
  endDate: string
}

const isoDate = (date: Date) => format(date, "yyyy-MM-dd")

export function getQuickRangeOptions(now: Date): QuickRangeOption[] {
  const today = isoDate(now)
  return [
    { key: "today", label: "Bugün", startDate: today, endDate: today },
    { key: "7d", label: "Son 7 gün", startDate: isoDate(subDays(now, 6)), endDate: today },
    { key: "30d", label: "Son 30 gün", startDate: isoDate(subDays(now, 29)), endDate: today },
    { key: "month", label: "Bu ay", startDate: isoDate(startOfMonth(now)), endDate: isoDate(endOfMonth(now)) },
  ]
}

export function getDefaultReportsRange(now: Date): Pick<ReportsScopeFilters, "startDate" | "endDate"> {
  const option = getQuickRangeOptions(now).find((item) => item.key === "30d")!
  return { startDate: option.startDate, endDate: option.endDate }
}

export function parseReportsQuery(searchParams: URLSearchParams, referenceData: VisitReferenceData, now: Date): ReportsQueryState {
  const tabParam = searchParams.get("tab")
  const tab: ReportTab = reportTabs.includes(tabParam as ReportTab) ? (tabParam as ReportTab) : "visits"

  const fromParam = parseDateParameter(searchParams.get("from"))
  const toParam = parseDateParameter(searchParams.get("to"))
  const hasExplicitRange = Boolean(fromParam || toParam)
  const defaultRange = getDefaultReportsRange(now)

  const companyParam = searchParams.get("company")
  const companyId = referenceData.companies.some((company) => company.id === companyParam) ? companyParam! : "all"
  const facilityParam = searchParams.get("facility")
  const facility = referenceData.facilities.find((item) => item.id === facilityParam)
  const facilityId = facility && (companyId === "all" || facility.companyId === companyId) ? facility.id : "all"

  return {
    tab,
    filters: {
      startDate: hasExplicitRange ? fromParam ?? "" : defaultRange.startDate,
      endDate: hasExplicitRange ? toParam ?? "" : defaultRange.endDate,
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
  next.delete("page")
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

export function matchesQuickRange(filters: Pick<ReportsScopeFilters, "startDate" | "endDate">, option: QuickRangeOption) {
  return filters.startDate === option.startDate && filters.endDate === option.endDate
}

function parseDateParameter(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

import { format, startOfMonth, subDays } from "date-fns"

export type QuickDateRangeKey = "today" | "7d" | "30d" | "month"

export interface QuickDateRangeOption {
  key: QuickDateRangeKey
  label: string
  startDate: string
  endDate: string
}

const isoDate = (date: Date) => format(date, "yyyy-MM-dd")

// This helper only creates shortcut values. It does not impose a maximum date on manual
// filters; report-specific historical restrictions remain in reports-filters.ts.
export function getQuickDateRangeOptions(now: Date): QuickDateRangeOption[] {
  const today = isoDate(now)
  return [
    { key: "today", label: "Bugün", startDate: today, endDate: today },
    { key: "7d", label: "Son 7 gün", startDate: isoDate(subDays(now, 6)), endDate: today },
    { key: "30d", label: "Son 30 gün", startDate: isoDate(subDays(now, 29)), endDate: today },
    { key: "month", label: "Bu ay", startDate: isoDate(startOfMonth(now)), endDate: today },
  ]
}

export function matchesQuickDateRange(
  filters: Pick<{ startDate: string; endDate: string }, "startDate" | "endDate">,
  option: QuickDateRangeOption,
) {
  return filters.startDate === option.startDate && filters.endDate === option.endDate
}

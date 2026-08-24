import { describe, expect, it } from "vitest"

import {
  getDefaultReportsRange,
  getComparisonPeriod,
  getMaxEndDate,
  getPreviousPeriod,
  getQuickRangeOptions,
  matchesQuickRange,
  parseReportsQuery,
  resetReportsFilters,
  setReportsComparison,
  setReportsCustomComparison,
  setReportsGranularity,
  setReportsPage,
  setReportsRange,
  setReportsTab,
  setReportsView,
  updateReportsSearchParams,
} from "@/features/reports/reports-filters"
import { mockVisitReferenceData } from "@/services/mock-visit-data"

const now = new Date("2026-08-17T12:00:00+03:00")

describe("reports quick ranges", () => {
  it("computes today, 7 day, 30 day and this-month ranges", () => {
    const [today, sevenDays, thirtyDays, month] = getQuickRangeOptions(now)
    expect(today).toMatchObject({ key: "today", startDate: "2026-08-17", endDate: "2026-08-17" })
    expect(sevenDays).toMatchObject({ key: "7d", startDate: "2026-08-11", endDate: "2026-08-17" })
    expect(thirtyDays).toMatchObject({ key: "30d", startDate: "2026-07-19", endDate: "2026-08-17" })
    expect(month).toMatchObject({ key: "month", startDate: "2026-08-01", endDate: "2026-08-17" })
  })

  it("defaults the reports range to the last 30 days", () => {
    expect(getDefaultReportsRange(now)).toEqual({ startDate: "2026-07-19", endDate: "2026-08-17" })
  })

  it("matches filters against a quick range option", () => {
    const option = getQuickRangeOptions(now)[0]
    expect(matchesQuickRange({ startDate: "2026-08-17", endDate: "2026-08-17" }, option)).toBe(true)
    expect(matchesQuickRange({ startDate: "2026-08-16", endDate: "2026-08-17" }, option)).toBe(false)
  })

  it("never lets a quick range's end date land in the future", () => {
    for (const option of getQuickRangeOptions(now)) {
      expect(option.endDate <= getMaxEndDate(now)).toBe(true)
    }
  })
})

describe("getMaxEndDate", () => {
  it("returns today as an ISO date", () => {
    expect(getMaxEndDate(now)).toBe("2026-08-17")
  })
})

describe("getPreviousPeriod", () => {
  it("mirrors the same-length period immediately preceding the range", () => {
    expect(getPreviousPeriod({ startDate: "2026-08-10", endDate: "2026-08-19" })).toEqual({ startDate: "2026-07-31", endDate: "2026-08-09" })
  })

  it("handles a single-day range", () => {
    expect(getPreviousPeriod({ startDate: "2026-08-19", endDate: "2026-08-19" })).toEqual({ startDate: "2026-08-18", endDate: "2026-08-18" })
  })

  it("returns null for an open-ended or inverted range", () => {
    expect(getPreviousPeriod({ startDate: "", endDate: "2026-08-19" })).toBeNull()
    expect(getPreviousPeriod({ startDate: "2026-08-19", endDate: "" })).toBeNull()
    expect(getPreviousPeriod({ startDate: "2026-08-19", endDate: "2026-08-01" })).toBeNull()
  })
})

describe("parseReportsQuery", () => {
  it("defaults to the visits tab, last-30-days range and unscoped company/facility", () => {
    const state = parseReportsQuery(new URLSearchParams(""), mockVisitReferenceData, now)
    expect(state.tab).toBe("visits")
    expect(state).toMatchObject({ view: "analysis", page: 1, comparison: "none", granularity: "daily" })
    expect(state.filters).toEqual({ startDate: "2026-07-19", endDate: "2026-08-17", companyId: "all", facilityId: "all" })
  })

  it("falls back to the visits tab for unknown or disabled tab values", () => {
    expect(parseReportsQuery(new URLSearchParams("tab=unknown"), mockVisitReferenceData, now).tab).toBe("visits")
    expect(parseReportsQuery(new URLSearchParams("tab=vehicle"), mockVisitReferenceData, now).tab).toBe("vehicle")
    expect(parseReportsQuery(new URLSearchParams("tab=goods"), mockVisitReferenceData, now).tab).toBe("goods")
  })

  it("uses the explicit range once either boundary is provided, leaving the other open", () => {
    const both = parseReportsQuery(new URLSearchParams("from=2026-08-01&to=2026-08-05"), mockVisitReferenceData, now)
    expect(both.filters).toMatchObject({ startDate: "2026-08-01", endDate: "2026-08-05" })

    const openEnded = parseReportsQuery(new URLSearchParams("from=2026-08-01"), mockVisitReferenceData, now)
    expect(openEnded.filters).toMatchObject({ startDate: "2026-08-01", endDate: "" })

    const invalid = parseReportsQuery(new URLSearchParams("from=not-a-date"), mockVisitReferenceData, now)
    expect(invalid.filters).toMatchObject({ startDate: "2026-07-19", endDate: "2026-08-17" })
  })

  it("clamps a future end date from the URL to today, since reports are historical", () => {
    const future = parseReportsQuery(new URLSearchParams("from=2026-08-01&to=2099-01-01"), mockVisitReferenceData, now)
    expect(future.filters).toMatchObject({ startDate: "2026-08-01", endDate: "2026-08-17" })
  })

  it("validates company and clears a facility that no longer matches the company", () => {
    const scoped = parseReportsQuery(new URLSearchParams("company=bplas&facility=otomotiv-uretim"), mockVisitReferenceData, now)
    expect(scoped.filters.companyId).toBe("bplas")
    expect(scoped.filters.facilityId).toBe("all")

    const unknownCompany = parseReportsQuery(new URLSearchParams("company=missing"), mockVisitReferenceData, now)
    expect(unknownCompany.filters.companyId).toBe("all")
  })

  it("parses records state from the URL and safely falls back for invalid values", () => {
    expect(parseReportsQuery(new URLSearchParams("view=records&page=2&comparison=previous&granularity=weekly"), mockVisitReferenceData, now)).toMatchObject({
      view: "records",
      page: 2,
      comparison: "previous",
      granularity: "weekly",
    })
    expect(parseReportsQuery(new URLSearchParams("view=unknown&page=0&comparison=other&granularity=monthly"), mockVisitReferenceData, now)).toMatchObject({
      view: "analysis",
      page: 1,
      comparison: "none",
      granularity: "daily",
    })
    expect(parseReportsQuery(new URLSearchParams("tab=vehicle&view=records"), mockVisitReferenceData, now).view).toBe("analysis")
  })
})

describe("shared comparison periods", () => {
  const filters = { startDate: "2026-06-01", endDate: "2026-08-31" }

  it("supports previous, previous-year and equal-length custom periods", () => {
    expect(getComparisonPeriod(filters, "previous")).toEqual({ startDate: "2026-03-01", endDate: "2026-05-31" })
    expect(getComparisonPeriod(filters, "previous-year")).toEqual({ startDate: "2025-06-01", endDate: "2025-08-31" })
    expect(getComparisonPeriod(filters, "custom", "2025-06-01")).toEqual({ startDate: "2025-06-01", endDate: "2025-08-31" })
  })

  it("handles leap-day ranges without producing an invalid date", () => {
    expect(getComparisonPeriod({ startDate: "2024-02-29", endDate: "2024-03-02" }, "previous-year")).toEqual({ startDate: "2023-02-28", endDate: "2023-03-02" })
  })

  it("cleans stale custom parameters when comparison changes", () => {
    expect(setReportsComparison(new URLSearchParams("comparison=custom&compareFrom=2025-06-01&compareTo=2025-08-31"), "previous").toString()).toBe("comparison=previous")
    expect(setReportsCustomComparison(new URLSearchParams(""), filters, "2025-06-01").toString()).toBe("comparison=custom&compareFrom=2025-06-01&compareTo=2025-08-31")
  })
})

describe("reports search param helpers", () => {
  it("clears the facility and page when the company changes", () => {
    const changed = updateReportsSearchParams(new URLSearchParams("page=3&facility=bplas-merkez&custom=kept"), "company", "bplas")
    expect(changed.get("company")).toBe("bplas")
    expect(changed.get("facility")).toBeNull()
    expect(changed.get("page")).toBeNull()
    expect(changed.get("custom")).toBe("kept")
  })

  it("removes a param when set back to an empty or 'all' value", () => {
    const cleared = updateReportsSearchParams(new URLSearchParams("company=bplas"), "company", "all")
    expect(cleared.get("company")).toBeNull()
  })

  it("omits the tab param for the default visits tab and sets it otherwise", () => {
    expect(setReportsTab(new URLSearchParams("tab=vehicle"), "visits").get("tab")).toBeNull()
    expect(setReportsTab(new URLSearchParams(""), "vehicle").get("tab")).toBe("vehicle")
  })

  it("sets or clears the from/to range params together", () => {
    const withRange = setReportsRange(new URLSearchParams(""), "2026-08-01", "2026-08-05")
    expect(withRange.get("from")).toBe("2026-08-01")
    expect(withRange.get("to")).toBe("2026-08-05")

    const cleared = setReportsRange(withRange, "", "")
    expect(cleared.get("from")).toBeNull()
    expect(cleared.get("to")).toBeNull()
    expect(cleared.get("page")).toBeNull()
  })

  it("keeps records state in URL helpers and resets only page when filters change", () => {
    const records = setReportsView(new URLSearchParams("page=2"), "records")
    expect(records.get("view")).toBe("records")
    expect(records.get("page")).toBeNull()

    const secondPage = setReportsPage(records, 2)
    expect(secondPage.get("page")).toBe("2")
    expect(setReportsPage(secondPage, 1).get("page")).toBeNull()
    expect(updateReportsSearchParams(secondPage, "company", "bplas").get("page")).toBeNull()

    expect(setReportsComparison(new URLSearchParams("page=2"), "previous").get("page")).toBe("2")
    expect(setReportsGranularity(new URLSearchParams("page=2"), "weekly").get("page")).toBe("2")
  })

  it("resets filters but preserves the selected report workspace", () => {
    const reset = resetReportsFilters(new URLSearchParams("tab=vehicle&view=records&page=2&from=2026-08-01&to=2026-08-05&company=bplas&facility=bplas-merkez&comparison=previous&granularity=weekly"))
    expect(reset.toString()).toBe("tab=vehicle&view=records")
  })
})

import { describe, expect, it } from "vitest"

import type { Visit } from "@/domain/visits"
import type { ReportsScopeFilters } from "@/features/reports/reports-filters"
import {
  buildVisitsReportSummarySentences,
  calculateSharedTrendYAxisMax,
  calculateVisitsReportDailyTrend,
  calculateVisitsReportHourlyTrendWithStatus,
  calculateVisitsReportKpis,
  calculateVisitsReportLateArrivalRate,
  calculateVisitsReportTrendWithStatus,
  calculateVisitsReportWeeklyTrendWithStatus,
  calculateVisitsTrendYAxis,
  findVisitsReportBusiestPeriods,
  formatVisitsReportDelta,
  filterVisitsForReport,
  getReportPageRange,
  getVisitsTrendBarSizing,
  getVisitsTrendTooltipPeriodContext,
  getReportPageCount,
  getVisitDelayMinutes,
  getVisitDurationMinutes,
  getVisitReportStatusGroup,
  groupVisitsReportDailyTrendByOutcome,
  paginateReportVisits,
  searchVisitsReportRecords,
  sortVisitsReportRecords,
  VISITS_REPORT_PAGE_SIZE,
  VISITS_REPORT_STATUS_LABELS,
} from "@/features/reports/visits-report-utils"
import { mockVisitReferenceData } from "@/services/mock-visit-data"

const baseFilters: ReportsScopeFilters = { startDate: "", endDate: "", companyId: "all", facilityId: "all" }

const visits = [
  visit("1", "2026-08-10T08:00:00+03:00", { firstName: "Ayşe", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara" }),
  visit("2", "2026-08-11T10:00:00+03:00", { firstName: "Bora", companyId: "bplas", facilityId: "bplas-arge", employeeId: "emre-yilmaz", invitationStatus: "FAILED" }),
  visit("3", "2026-08-12T12:00:00+03:00", { firstName: "Ceren", companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", employeeId: "selin-aydin", status: "CHECKED_IN" }),
  visit("4", "2026-08-13T09:00:00+03:00", { firstName: "Deniz", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", invitationStatus: "NOT_SENT" }),
]

describe("filterVisitsForReport", () => {
  it("includes NOT_SENT invitations, unlike the All Visits operational list", () => {
    expect(ids(filterVisitsForReport(visits, baseFilters))).toEqual(expect.arrayContaining(["4"]))
    expect(filterVisitsForReport(visits, baseFilters)).toHaveLength(4)
  })

  it("applies the shared date-range and company/facility filters", () => {
    expect(ids(filterVisitsForReport(visits, { ...baseFilters, startDate: "2026-08-11", endDate: "2026-08-12" }))).toEqual(["3", "2"])
    expect(ids(filterVisitsForReport(visits, { ...baseFilters, companyId: "bplas-otomotiv" }))).toEqual(["3"])
    expect(ids(filterVisitsForReport(visits, { ...baseFilters, facilityId: "bplas-arge" }))).toEqual(["2"])
  })

  it("returns an empty set for an inverted date range", () => {
    expect(filterVisitsForReport(visits, { ...baseFilters, startDate: "2026-08-13", endDate: "2026-08-10" })).toEqual([])
  })

  it("sorts by planned start descending, most recent first", () => {
    expect(ids(filterVisitsForReport(visits, baseFilters))).toEqual(["4", "3", "2", "1"])
  })
})

describe("visits records search and sort", () => {
  it("searches visitor, visitor company and host with Turkish case handling", () => {
    expect(ids(searchVisitsReportRecords(visits, "ayşe"))).toEqual(["1"])
    expect(ids(searchVisitsReportRecords(visits, "TEST A.Ş."))).toEqual(["1", "2", "3", "4"])
    expect(ids(searchVisitsReportRecords(visits, "selin"))).toEqual(["3"])
    expect(searchVisitsReportRecords(visits, "")).toHaveLength(4)
  })

  it("sorts representative string, date and status fields", () => {
    expect(ids(sortVisitsReportRecords(visits, { field: "visitor", direction: "desc" }))).toEqual(["4", "3", "2", "1"])
    expect(ids(sortVisitsReportRecords(visits, { field: "date", direction: "desc" }))).toEqual(["4", "3", "2", "1"])
    expect(ids(sortVisitsReportRecords(visits, { field: "status", direction: "asc" }))).toEqual(["1", "2", "4", "3"])
  })
})

describe("getVisitDelayMinutes", () => {
  it("returns null when the visitor never checked in", () => {
    expect(getVisitDelayMinutes(visit("x", "2026-08-10T08:00:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara" }))).toBeNull()
  })

  it("measures minutes late relative to planned start", () => {
    const late = visit("x", "2026-08-10T08:00:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", actualCheckIn: "2026-08-10T08:12:00+03:00" })
    expect(getVisitDelayMinutes(late)).toBe(12)
  })

  it("clamps early arrivals to zero instead of a negative delay", () => {
    const early = visit("x", "2026-08-10T08:00:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", actualCheckIn: "2026-08-10T07:45:00+03:00" })
    expect(getVisitDelayMinutes(early)).toBe(0)
  })
})

describe("getVisitDurationMinutes", () => {
  it("returns null when either actual timestamp is missing", () => {
    expect(getVisitDurationMinutes(visit("x", "2026-08-10T08:00:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara" }))).toBeNull()
    expect(getVisitDurationMinutes(visit("x", "2026-08-10T08:00:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", actualCheckIn: "2026-08-10T08:00:00+03:00" }))).toBeNull()
  })

  it("measures minutes between actual check-in and check-out", () => {
    const done = visit("x", "2026-08-10T08:00:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", actualCheckIn: "2026-08-10T08:00:00+03:00", actualCheckOut: "2026-08-10T09:15:00+03:00" })
    expect(getVisitDurationMinutes(done)).toBe(75)
  })
})

describe("getVisitReportStatusGroup", () => {
  it("groups CHECKED_IN and CHECKED_OUT into COMPLETED, and keeps the other statuses as-is", () => {
    expect(getVisitReportStatusGroup("PLANNED")).toBe("PLANNED")
    expect(getVisitReportStatusGroup("CHECKED_IN")).toBe("COMPLETED")
    expect(getVisitReportStatusGroup("CHECKED_OUT")).toBe("COMPLETED")
    expect(getVisitReportStatusGroup("NO_SHOW")).toBe("NO_SHOW")
    expect(getVisitReportStatusGroup("CANCELLED")).toBe("CANCELLED")
  })

  it("presents NO_SHOW as Gerçekleşmedi without changing the domain status", () => {
    expect(VISITS_REPORT_STATUS_LABELS[getVisitReportStatusGroup("NO_SHOW")]).toBe("Gerçekleşmedi")
  })
})

describe("calculateVisitsReportKpis", () => {
  it("computes totals, completion count, actually checked in and average duration", () => {
    const kpiVisits = [
      visit("a", "2026-08-10T08:00:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", status: "CHECKED_OUT", actualCheckIn: "2026-08-10T08:00:00+03:00", actualCheckOut: "2026-08-10T09:00:00+03:00" }),
      visit("b", "2026-08-10T08:00:00+03:00", { firstName: "B", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", status: "CHECKED_OUT", actualCheckIn: "2026-08-10T08:00:00+03:00", actualCheckOut: "2026-08-10T08:30:00+03:00" }),
      visit("c", "2026-08-10T08:00:00+03:00", { firstName: "C", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", status: "NO_SHOW" }),
      visit("d", "2026-08-10T08:00:00+03:00", { firstName: "D", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", status: "CANCELLED" }),
    ]
    const kpis = calculateVisitsReportKpis(kpiVisits)
    expect(kpis.total).toBe(4)
    expect(kpis.completed).toBe(2)
    expect(kpis.actuallyCheckedIn).toBe(2)
    expect(kpis.averageDurationMinutes).toBe(45)
    expect(kpis.lateArrivals).toBe(0)
  })

  it("reports a null average duration and zero counts when there is no data", () => {
    expect(calculateVisitsReportKpis([])).toEqual({ total: 0, completed: 0, actuallyCheckedIn: 0, averageDurationMinutes: null, lateArrivals: 0 })
  })

  it("counts lateArrivals only for visits with an actual check-in that is after the planned start", () => {
    const kpiVisits = [
      visit("a", "2026-08-10T08:00:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", status: "PLANNED" }),
      visit("b", "2026-08-10T08:00:00+03:00", { firstName: "B", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", status: "CHECKED_IN", actualCheckIn: "2026-08-10T08:15:00+03:00" }),
      visit("c", "2026-08-10T08:00:00+03:00", { firstName: "C", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", status: "CHECKED_IN", actualCheckIn: "2026-08-10T07:50:00+03:00" }),
    ]
    expect(calculateVisitsReportKpis(kpiVisits).lateArrivals).toBe(1)
  })
})

describe("groupVisitsReportDailyTrendByOutcome", () => {
  it("merges CHECKED_IN and CHECKED_OUT into a single COMPLETED count and keeps other statuses as-is", () => {
    const points = [
      { date: "2026-08-10", label: "10 Ağu", PLANNED: 2, CHECKED_IN: 3, CHECKED_OUT: 1, NO_SHOW: 4, CANCELLED: 5 },
    ]
    expect(groupVisitsReportDailyTrendByOutcome(points)).toEqual([
      { date: "2026-08-10", label: "10 Ağu", PLANNED: 2, COMPLETED: 4, NO_SHOW: 4, CANCELLED: 5 },
    ])
  })
})

describe("calculateVisitsReportDailyTrend", () => {
  it("fills every day in a bounded range with zero counts where there is no data", () => {
    const trendVisits = [visit("a", "2026-08-11T08:00:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara" })]
    const trend = calculateVisitsReportDailyTrend(trendVisits, { ...baseFilters, startDate: "2026-08-10", endDate: "2026-08-12" })
    expect(trend.map((point) => point.date)).toEqual(["2026-08-10", "2026-08-11", "2026-08-12"])
    expect(trend.map((point) => point.count)).toEqual([0, 1, 0])
  })

  it("only returns days that have visits when the range is unbounded", () => {
    const trendVisits = [
      visit("a", "2026-08-11T08:00:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara" }),
      visit("b", "2026-08-13T08:00:00+03:00", { firstName: "B", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara" }),
    ]
    const trend = calculateVisitsReportDailyTrend(trendVisits, baseFilters)
    expect(trend.map((point) => point.date)).toEqual(["2026-08-11", "2026-08-13"])
    expect(trend.map((point) => point.count)).toEqual([1, 1])
  })
})

describe("report pagination", () => {
  it("uses a fixed nine-record page size with stable ranges", () => {
    const records = Array.from({ length: 24 }, (_, index) => ({ id: String(index) }))
    expect(VISITS_REPORT_PAGE_SIZE).toBe(9)
    expect(getReportPageCount(records.length)).toBe(3)
    expect(paginateReportVisits(records as Visit[], 1)).toHaveLength(9)
    expect(paginateReportVisits(records as Visit[], 2)).toHaveLength(9)
    expect(paginateReportVisits(records as Visit[], 3)).toHaveLength(6)
    expect(getReportPageRange(24, 1)).toEqual({ start: 1, end: 9 })
    expect(getReportPageRange(24, 2)).toEqual({ start: 10, end: 18 })
    expect(getReportPageRange(24, 3)).toEqual({ start: 19, end: 24 })
  })
})

describe("calculateSharedTrendYAxisMax", () => {
  it("uses the larger of the two periods' tallest stacked-bar totals, rounded up to a multiple of 5", () => {
    const current = [{ date: "2026-08-10", label: "10 Ağu", PLANNED: 3, COMPLETED: 4, NO_SHOW: 1, CANCELLED: 0 }]
    const previous = [{ date: "2026-07-10", label: "10 Tem", PLANNED: 1, COMPLETED: 1, NO_SHOW: 0, CANCELLED: 0 }]
    // current day total = 8 -> rounds up to 10
    expect(calculateSharedTrendYAxisMax(current, previous)).toBe(10)
  })

  it("picks up the previous period's total when it is the larger one", () => {
    const current = [{ date: "2026-08-10", label: "10 Ağu", PLANNED: 1, COMPLETED: 1, NO_SHOW: 0, CANCELLED: 0 }]
    const previous = [{ date: "2026-07-10", label: "10 Tem", PLANNED: 5, COMPLETED: 5, NO_SHOW: 5, CANCELLED: 0 }]
    // previous day total = 15, already a multiple of 5
    expect(calculateSharedTrendYAxisMax(current, previous)).toBe(15)
  })

  it("returns a small positive default when both periods are entirely empty", () => {
    expect(calculateSharedTrendYAxisMax([], [])).toBe(5)
  })
})

describe("buildVisitsReportSummarySentences", () => {
  const current = {
    kpis: { total: 10, completed: 4, actuallyCheckedIn: 6, averageDurationMinutes: 75, lateArrivals: 2 },
    trend: [
      { date: "2026-08-10", label: "10 Ağu", PLANNED: 1, COMPLETED: 1, NO_SHOW: 0, CANCELLED: 0 },
      { date: "2026-08-12", label: "12 Ağu", PLANNED: 2, COMPLETED: 3, NO_SHOW: 0, CANCELLED: 0 },
    ],
  }

  it("reports a single sentence when there are no visits in the period", () => {
    const empty = { kpis: { total: 0, completed: 0, actuallyCheckedIn: 0, averageDurationMinutes: null, lateArrivals: 0 } }
    expect(buildVisitsReportSummarySentences(empty, null)).toEqual(["Seçili dönemde kayıtlı ziyaret bulunmuyor."])
  })

  it("keeps the single-period summary to two concise sentences", () => {
    const sentences = buildVisitsReportSummarySentences(current, null)
    expect(sentences).toEqual([
      "En yoğun gün 12 Ağu oldu.",
      "Geç girişler gerçekleşen ziyaretlerin %33'sini oluşturdu.",
    ])
    expect(sentences.some((sentence) => sentence.includes("önceki döneme"))).toBe(false)
  })

  it("keeps comparison summary to three natural metric-focused sentences", () => {
    const previous = {
      kpis: { total: 5, completed: 2, actuallyCheckedIn: 3, averageDurationMinutes: 60, lateArrivals: 4 },
    }
    const sentences = buildVisitsReportSummarySentences(current, previous)
    expect(sentences).toEqual([
      "Toplam ziyaret sayısı 5 arttı; gerçekleşen ziyaret sayısı 3 arttı.",
      "Ortalama ziyaret süresi 15 dakika uzadı.",
      "2 daha az geç giriş kaydedildi.",
    ])
    expect(sentences).toHaveLength(3)
  })

  it("does not produce a misleading percentage when the previous period had zero of a metric", () => {
    const previousZero = { kpis: { total: 0, completed: 0, actuallyCheckedIn: 0, averageDurationMinutes: null, lateArrivals: 0 }, statusCounts: [], busiestDay: null }
    const sentences = buildVisitsReportSummarySentences(current, previousZero)
    expect(sentences.join(" ")).not.toContain("%")
    expect(sentences.length).toBeLessThanOrEqual(3)
  })

  it("states when the average duration cannot be computed", () => {
    const noCompleted = { kpis: { total: 3, completed: 0, actuallyCheckedIn: 0, averageDurationMinutes: null, lateArrivals: 0 } }
    const sentences = buildVisitsReportSummarySentences(noCompleted, null)
    expect(sentences).toEqual([
      "Ziyaret dağılımı için yeterli zaman verisi bulunmuyor.",
      "Ziyaretler planlanan akış içinde ilerledi.",
    ])
  })

  it("describes a shorter average duration as 'kısaldı'", () => {
    const previousLonger = {
      kpis: { total: 10, completed: 4, actuallyCheckedIn: 6, averageDurationMinutes: 100, lateArrivals: 2 },
    }
    const sentences = buildVisitsReportSummarySentences(current, previousLonger)
    expect(sentences).toEqual(["Ortalama ziyaret süresi 25 dakika kısaldı."])
  })

  it("omits the duration comparison when the previous period has no computable average", () => {
    const previousNoCompleted = {
      kpis: { total: 5, completed: 0, actuallyCheckedIn: 0, averageDurationMinutes: null, lateArrivals: 0 },
    }
    const sentences = buildVisitsReportSummarySentences(current, previousNoCompleted)
    expect(sentences.join(" ")).not.toContain("Ortalama ziyaret süresi")
    expect(sentences.join(" ")).not.toContain("kısaldı")
    expect(sentences.join(" ")).not.toContain("uzadı")
  })

  it("reports tied busiest hours and days instead of choosing the first maximum", () => {
    const hourlyTrend = [
      { date: "hour-06", label: "06:00", PLANNED: 2, COMPLETED: 0, NO_SHOW: 0, CANCELLED: 0 },
      { date: "hour-07", label: "07:00", PLANNED: 1, COMPLETED: 0, NO_SHOW: 0, CANCELLED: 0 },
      { date: "hour-08", label: "08:00", PLANNED: 0, COMPLETED: 2, NO_SHOW: 0, CANCELLED: 0 },
    ]
    const dailyTrend = [
      { date: "2026-08-10", label: "10 Ağu", PLANNED: 0, COMPLETED: 3, NO_SHOW: 0, CANCELLED: 0 },
      { date: "2026-08-11", label: "11 Ağu", PLANNED: 1, COMPLETED: 0, NO_SHOW: 0, CANCELLED: 0 },
      { date: "2026-08-12", label: "12 Ağu", PLANNED: 1, COMPLETED: 2, NO_SHOW: 0, CANCELLED: 0 },
    ]

    expect(findVisitsReportBusiestPeriods(hourlyTrend)).toMatchObject({ kind: "hour", labels: ["06:00", "08:00"], tiedCount: 2 })
    expect(findVisitsReportBusiestPeriods(dailyTrend)).toMatchObject({ kind: "day", labels: ["10 Ağu", "12 Ağu"], tiedCount: 2 })
    expect(buildVisitsReportSummarySentences({ ...current, trend: hourlyTrend }, null)[0]).toBe("En yoğun saatler 06:00 ve 08:00 oldu.")
    expect(buildVisitsReportSummarySentences({ ...current, trend: dailyTrend }, null)[0]).toBe("En yoğun günler 10 Ağu ve 12 Ağu oldu.")
  })

  it("summarizes a large busiest-period tie without listing every label", () => {
    const tiedTrend = ["06:00", "07:00", "08:00", "09:00"].map((label, index) => ({
      date: `hour-${index}`,
      label,
      PLANNED: 2,
      COMPLETED: 0,
      NO_SHOW: 0,
      CANCELLED: 0,
    }))

    expect(buildVisitsReportSummarySentences({ ...current, trend: tiedTrend }, null)[0]).toBe("4 farklı saat aynı yoğunluğa ulaştı.")

    const tiedDailyTrend = ["10 Ağu", "11 Ağu", "12 Ağu", "13 Ağu"].map((label, index) => ({
      date: `day-${index}`,
      label,
      PLANNED: 2,
      COMPLETED: 0,
      NO_SHOW: 0,
      CANCELLED: 0,
    }))

    expect(buildVisitsReportSummarySentences({ ...current, trend: tiedDailyTrend }, null)[0]).toBe(
      "4 farklı gün aynı en yüksek ziyaret sayısına ulaştı.",
    )
  })

  it("uses checked-in visits as the late-arrival denominator and handles zero safely", () => {
    expect(calculateVisitsReportLateArrivalRate({ ...current.kpis, actuallyCheckedIn: 8, lateArrivals: 4 })).toBe(50)
    expect(calculateVisitsReportLateArrivalRate({ ...current.kpis, actuallyCheckedIn: 0, lateArrivals: 0 })).toBeNull()

    const noCheckedIn = { ...current, kpis: { ...current.kpis, actuallyCheckedIn: 0, lateArrivals: 0 } }
    expect(buildVisitsReportSummarySentences(noCheckedIn, null).join(" ")).not.toContain("Geç girişler gerçekleşen ziyaretlerin")
  })
})

describe("visits trend chart sizing", () => {
  it("returns evenly spaced deterministic Y ticks for a shared comparison axis", () => {
    expect(calculateVisitsTrendYAxis(10)).toEqual({ max: 10, ticks: [0, 2, 4, 6, 8, 10] })
    expect(calculateVisitsTrendYAxis(12)).toEqual({ max: 12, ticks: [0, 3, 6, 9, 12] })
  })

  it("keeps a single-bucket bar compact and applies one sizing strategy across densities", () => {
    expect(getVisitsTrendBarSizing(1)).toEqual({ maxBarSize: 24, barCategoryGap: "80%" })
    expect(getVisitsTrendBarSizing(7)).toEqual({ maxBarSize: 28, barCategoryGap: "38%" })
    expect(getVisitsTrendBarSizing(30).maxBarSize).toBeLessThan(getVisitsTrendBarSizing(7).maxBarSize)
  })
})

describe("formatVisitsReportDelta", () => {
  it("returns only a neutral absolute delta for metadata", () => {
    expect(formatVisitsReportDelta(5, 0)).toEqual({ difference: 5, label: "+5" })
    expect(formatVisitsReportDelta(12, 10)).toEqual({ difference: 2, label: "+2" })
    expect(formatVisitsReportDelta(8, 10)).toEqual({ difference: -2, label: "−2" })
  })
})

describe("report trend aggregation", () => {
  const trendVisits = [
    visit("morning", "2026-08-10T08:15:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara" }),
    visit("late", "2026-08-10T10:45:00+03:00", { firstName: "B", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", status: "CHECKED_IN" }),
    visit("week-two", "2026-08-17T09:00:00+03:00", { firstName: "C", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", status: "CANCELLED" }),
  ]

  it("uses planned Istanbul wall-clock hours for today's hourly buckets", () => {
    expect(calculateVisitsReportHourlyTrendWithStatus(trendVisits.slice(0, 2))).toEqual([
      { date: "hour-08", label: "08:00", PLANNED: 1, CHECKED_IN: 0, CHECKED_OUT: 0, NO_SHOW: 0, CANCELLED: 0 },
      { date: "hour-09", label: "09:00", PLANNED: 0, CHECKED_IN: 0, CHECKED_OUT: 0, NO_SHOW: 0, CANCELLED: 0 },
      { date: "hour-10", label: "10:00", PLANNED: 0, CHECKED_IN: 1, CHECKED_OUT: 0, NO_SHOW: 0, CANCELLED: 0 },
    ])
  })

  it("keeps daily aggregation outside the hourly mode", () => {
    const filters = { ...baseFilters, startDate: "2026-08-10", endDate: "2026-08-10" }
    expect(calculateVisitsReportTrendWithStatus(trendVisits, filters, "daily")).toHaveLength(1)
    expect(calculateVisitsReportTrendWithStatus(trendVisits, filters, "daily")[0].label).toBe("10 Ağu")
  })

  it("anchors weekly buckets to the selected start instead of calendar weeks", () => {
    const filters = { ...baseFilters, startDate: "2026-08-18", endDate: "2026-08-24" }
    const weekly = calculateVisitsReportWeeklyTrendWithStatus([], filters)
    expect(weekly).toHaveLength(1)
    expect(weekly[0].label).toBe("18 Ağu–24 Ağu")
    expect(weekly[0].periodDayCount).toBe(7)
  })

  it("splits a 30-day range into consecutive seven-day buckets and one remainder", () => {
    const filters = { ...baseFilters, startDate: "2026-08-01", endDate: "2026-08-30" }
    const weekly = calculateVisitsReportWeeklyTrendWithStatus([], filters)
    expect(weekly.map((point) => point.label)).toEqual([
      "1 Ağu–7 Ağu",
      "8 Ağu–14 Ağu",
      "15 Ağu–21 Ağu",
      "22 Ağu–28 Ağu",
      "29 Ağu–30 Ağu",
    ])
    expect(weekly.map((point) => point.periodDayCount)).toEqual([7, 7, 7, 7, 2])
    const grouped = groupVisitsReportDailyTrendByOutcome(weekly)
    expect(getVisitsTrendTooltipPeriodContext(grouped[3])).toBeNull()
    expect(getVisitsTrendTooltipPeriodContext(grouped[4])).toBe("2 günlük dönem")
  })

  it("uses the same start-anchored strategy for the comparison period", () => {
    const currentFilters = { ...baseFilters, startDate: "2026-08-18", endDate: "2026-08-24" }
    const previousFilters = { ...baseFilters, startDate: "2026-08-11", endDate: "2026-08-17" }
    expect(calculateVisitsReportWeeklyTrendWithStatus([], currentFilters).map((point) => point.label)).toEqual(["18 Ağu–24 Ağu"])
    expect(calculateVisitsReportWeeklyTrendWithStatus([], previousFilters).map((point) => point.label)).toEqual(["11 Ağu–17 Ağu"])
  })

  it("does not include visits outside the selected range", () => {
    const filters = { ...baseFilters, startDate: "2026-08-10", endDate: "2026-08-17" }
    const weekly = calculateVisitsReportWeeklyTrendWithStatus(trendVisits, filters)
    expect(weekly).toMatchObject([
      { label: "10 Ağu–16 Ağu", PLANNED: 1, CHECKED_IN: 1 },
      { label: "17 Ağu–17 Ağu", CANCELLED: 1 },
    ])
  })
})

function ids(records: Visit[]) {
  return records.map((record) => record.id)
}

function visit(id: string, plannedStart: string, overrides: {
  firstName: string
  companyId: string
  facilityId: string
  employeeId: string
  status?: Visit["status"]
  invitationStatus?: Visit["invitationStatus"]
  actualCheckIn?: string
  actualCheckOut?: string
}): Visit {
  const company = mockVisitReferenceData.companies.find((item) => item.id === overrides.companyId)!
  const facility = mockVisitReferenceData.facilities.find((item) => item.id === overrides.facilityId)!
  const employee = mockVisitReferenceData.employees.find((item) => item.id === overrides.employeeId)!
  const type = mockVisitReferenceData.visitTypes.find((item) => item.id === "meeting")!
  return {
    id,
    meetingId: `meeting-${id}`,
    creatorEmployeeId: "creator-1",
    visitor: { id: `visitor-${id}`, firstName: overrides.firstName, lastName: "Test", email: `${id}@example.com`, company: "Test A.Ş." },
    visitTypeId: type.id,
    visitTypeName: type.name,
    hostEmployeeId: employee.id,
    hostEmployeeName: employee.name,
    hostCompanyId: company.id,
    hostCompanyName: company.name,
    facilityId: facility.id,
    facilityName: facility.name,
    plannedStart,
    plannedEnd: plannedStart,
    status: overrides.status ?? "PLANNED",
    invitationStatus: overrides.invitationStatus ?? "SENT",
    hasAdditionalRequirements: false,
    actualCheckIn: overrides.actualCheckIn,
    actualCheckOut: overrides.actualCheckOut,
    createdAt: plannedStart,
    updatedAt: plannedStart,
  }
}

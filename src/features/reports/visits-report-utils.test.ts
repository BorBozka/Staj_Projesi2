import { describe, expect, it } from "vitest"

import type { Visit } from "@/domain/visits"
import type { ReportsScopeFilters } from "@/features/reports/reports-filters"
import {
  buildVisitsReportSummarySentences,
  calculateSharedTrendYAxisMax,
  calculateVisitsReportChangePercent,
  calculateVisitsReportDailyTrend,
  calculateVisitsReportKpis,
  calculateVisitsReportStatusCounts,
  filterVisitsForReport,
  findVisitsReportBusiestDay,
  getReportPageCount,
  getVisitDelayMinutes,
  getVisitDurationMinutes,
  getVisitReportStatusGroup,
  groupVisitsReportDailyTrendByOutcome,
  paginateReportVisits,
  VISITS_REPORT_PAGE_SIZE,
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

describe("calculateVisitsReportStatusCounts", () => {
  it("counts every status in a fixed order, including zero counts", () => {
    const statusVisits = [
      visit("a", "2026-08-10T08:00:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", status: "PLANNED" }),
      visit("b", "2026-08-10T08:00:00+03:00", { firstName: "B", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", status: "PLANNED" }),
      visit("c", "2026-08-10T08:00:00+03:00", { firstName: "C", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara", status: "CANCELLED" }),
    ]
    expect(calculateVisitsReportStatusCounts(statusVisits)).toEqual([
      { status: "PLANNED", count: 2 },
      { status: "CHECKED_IN", count: 0 },
      { status: "CHECKED_OUT", count: 0 },
      { status: "NO_SHOW", count: 0 },
      { status: "CANCELLED", count: 1 },
    ])
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
  it("paginates using the shared pagination helpers", () => {
    const records = Array.from({ length: 25 }, (_, index) => ({ id: String(index) }))
    expect(VISITS_REPORT_PAGE_SIZE).toBe(10)
    expect(getReportPageCount(records.length)).toBe(3)
    expect(paginateReportVisits(records as Visit[], 1)).toHaveLength(10)
    expect(paginateReportVisits(records as Visit[], 3)).toHaveLength(5)
  })
})

describe("findVisitsReportBusiestDay", () => {
  it("returns the day with the most visits", () => {
    const dayVisits = [
      visit("a", "2026-08-10T08:00:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara" }),
      visit("b", "2026-08-11T08:00:00+03:00", { firstName: "B", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara" }),
      visit("c", "2026-08-11T09:00:00+03:00", { firstName: "C", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara" }),
    ]
    expect(findVisitsReportBusiestDay(dayVisits)).toEqual({ date: "2026-08-11", label: "11 Ağu", count: 2 })
  })

  it("breaks ties by the earliest date", () => {
    const tiedVisits = [
      visit("a", "2026-08-12T08:00:00+03:00", { firstName: "A", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara" }),
      visit("b", "2026-08-10T08:00:00+03:00", { firstName: "B", companyId: "bplas", facilityId: "bplas-merkez", employeeId: "maya-kara" }),
    ]
    expect(findVisitsReportBusiestDay(tiedVisits)?.date).toBe("2026-08-10")
  })

  it("returns null for an empty list", () => {
    expect(findVisitsReportBusiestDay([])).toBeNull()
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

describe("calculateVisitsReportChangePercent", () => {
  it("computes a rounded percentage change", () => {
    expect(calculateVisitsReportChangePercent(15, 10)).toBe(50)
    expect(calculateVisitsReportChangePercent(5, 10)).toBe(-50)
    expect(calculateVisitsReportChangePercent(10, 10)).toBe(0)
  })

  it("returns 0 for a 0-to-0 comparison and null when only the previous value is zero", () => {
    expect(calculateVisitsReportChangePercent(0, 0)).toBe(0)
    expect(calculateVisitsReportChangePercent(5, 0)).toBeNull()
  })
})

describe("buildVisitsReportSummarySentences", () => {
  const current = {
    kpis: { total: 10, completed: 4, actuallyCheckedIn: 6, averageDurationMinutes: 75, lateArrivals: 2 },
    statusCounts: [
      { status: "PLANNED" as const, count: 2 },
      { status: "CHECKED_IN" as const, count: 2 },
      { status: "CHECKED_OUT" as const, count: 4 },
      { status: "NO_SHOW" as const, count: 1 },
      { status: "CANCELLED" as const, count: 1 },
    ],
    busiestDay: { date: "2026-08-11", label: "11 Ağu", count: 4 },
  }

  it("reports a single sentence when there are no visits in the period", () => {
    const empty = { kpis: { total: 0, completed: 0, actuallyCheckedIn: 0, averageDurationMinutes: null, lateArrivals: 0 }, statusCounts: [], busiestDay: null }
    expect(buildVisitsReportSummarySentences(empty, null)).toEqual(["Seçili dönemde kayıtlı ziyaret bulunmuyor."])
  })

  it("omits comparison clauses when there is no previous period", () => {
    const sentences = buildVisitsReportSummarySentences(current, null)
    expect(sentences[0]).toBe("Seçili dönemde toplam 10 ziyaret kaydı bulunuyor.")
    expect(sentences.some((sentence) => sentence.includes("önceki döneme"))).toBe(false)
  })

  it("adds natural-language comparison clauses when a previous period is provided, using a minute delta for duration rather than a percentage", () => {
    const previous = {
      kpis: { total: 5, completed: 2, actuallyCheckedIn: 3, averageDurationMinutes: 60, lateArrivals: 4 },
      statusCounts: [],
      busiestDay: null,
    }
    const sentences = buildVisitsReportSummarySentences(current, previous)
    expect(sentences[0]).toBe("Seçili dönemde toplam 10 ziyaret kaydı bulunuyor, önceki döneme göre %100 arttı.")
    expect(sentences.some((sentence) => sentence.includes("%50 azaldı"))).toBe(true)
    expect(sentences.some((sentence) => sentence.includes("15 dk uzadı"))).toBe(true)
  })

  it("does not produce a misleading percentage when the previous period had zero of a metric", () => {
    const previousZero = { kpis: { total: 0, completed: 0, actuallyCheckedIn: 0, averageDurationMinutes: null, lateArrivals: 0 }, statusCounts: [], busiestDay: null }
    const sentences = buildVisitsReportSummarySentences(current, previousZero)
    expect(sentences[0]).toBe("Seçili dönemde toplam 10 ziyaret kaydı bulunuyor.")
  })

  it("states when the average duration cannot be computed", () => {
    const noCompleted = { kpis: { total: 3, completed: 0, actuallyCheckedIn: 0, averageDurationMinutes: null, lateArrivals: 0 }, statusCounts: [], busiestDay: null }
    const sentences = buildVisitsReportSummarySentences(noCompleted, null)
    expect(sentences.some((sentence) => sentence === "Tamamlanmış ziyaret bulunmadığından ortalama süre hesaplanamadı.")).toBe(true)
  })

  it("describes a shorter average duration as 'kısaldı'", () => {
    const previousLonger = {
      kpis: { total: 10, completed: 4, actuallyCheckedIn: 6, averageDurationMinutes: 100, lateArrivals: 2 },
      statusCounts: [],
      busiestDay: null,
    }
    const sentences = buildVisitsReportSummarySentences(current, previousLonger)
    expect(sentences.some((sentence) => sentence.includes("25 dk kısaldı"))).toBe(true)
  })

  it("omits the duration comparison when the previous period has no computable average", () => {
    const previousNoCompleted = {
      kpis: { total: 5, completed: 0, actuallyCheckedIn: 0, averageDurationMinutes: null, lateArrivals: 0 },
      statusCounts: [],
      busiestDay: null,
    }
    const sentences = buildVisitsReportSummarySentences(current, previousNoCompleted)
    expect(sentences.some((sentence) => sentence.startsWith("Ortalama ziyaret süresi"))).toBe(true)
    expect(sentences.some((sentence) => sentence.includes("kısaldı") || sentence.includes("uzadı"))).toBe(false)
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

import { describe, expect, it } from "vitest"

import type { GoodsMovement } from "@/domain/goods-movements"
import type { ReportsScopeFilters } from "@/features/reports/reports-filters"
import {
  buildGoodsInsight,
  calculateGoodsMovementTrend,
  calculateGoodsReportKpis,
  calculateSharedGoodsTrendYAxis,
  formatGoodsReportDelta,
  filterGoodsMovementsForReport,
  getGoodsReportPageCount,
  GOODS_REPORT_PAGE_SIZE,
  isGoodsRecordActivationKey,
  parseGoodsReportWorkspace,
  paginateGoodsReport,
  setGoodsReportPage,
  setGoodsReportWorkspace,
  searchGoodsReportRecords,
  sortGoodsReportRecords,
} from "@/features/reports/goods-report-utils"

const baseFilters: ReportsScopeFilters = { startDate: "", endDate: "", companyId: "all", facilityId: "all" }
const past = new Date(Date.now() - 24 * 60 * 60 * 1000)
const pastDate = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, "0")}-${String(past.getDate()).padStart(2, "0")}`

const movements = [
  movement("1", "INBOUND", "2026-08-10", { companyId: "bplas", facilityId: "bplas-merkez" }),
  movement("2", "OUTBOUND", "2026-08-11", { companyId: "bplas", facilityId: "bplas-arge" }),
  movement("3", "INBOUND", "2026-08-12", { companyId: "bplas-otomotiv", facilityId: "otomotiv-uretim", status: "CANCELLED" }),
]

describe("filterGoodsMovementsForReport", () => {
  it("applies the date-range and company/facility scope filters", () => {
    expect(ids(filterGoodsMovementsForReport(movements, baseFilters))).toEqual(["3", "2", "1"])
    expect(ids(filterGoodsMovementsForReport(movements, { ...baseFilters, startDate: "2026-08-11", endDate: "2026-08-12" }))).toEqual(["3", "2"])
    expect(ids(filterGoodsMovementsForReport(movements, { ...baseFilters, companyId: "bplas-otomotiv" }))).toEqual(["3"])
    expect(ids(filterGoodsMovementsForReport(movements, { ...baseFilters, facilityId: "bplas-arge" }))).toEqual(["2"])
  })

  it("returns an empty set for an inverted date range", () => {
    expect(filterGoodsMovementsForReport(movements, { ...baseFilters, startDate: "2026-08-13", endDate: "2026-08-10" })).toEqual([])
  })

  it("sorts by planned date/time descending, most recent first", () => {
    expect(ids(filterGoodsMovementsForReport(movements, baseFilters))).toEqual(["3", "2", "1"])
  })
})

describe("calculateGoodsReportKpis", () => {
  it("computes totals, inbound/outbound counts and the late rate", () => {
    const lateMovement = movement("late", "INBOUND", pastDate, { companyId: "bplas", facilityId: "bplas-merkez", plannedTime: "08:00" })
    const kpis = calculateGoodsReportKpis([...movements, lateMovement])
    expect(kpis.total).toBe(4)
    expect(kpis.inbound).toBe(3)
    expect(kpis.outbound).toBe(1)
    expect(kpis.lateRate).toBe(25)
  })

  it("reports zero totals and rate when there is no data", () => {
    expect(calculateGoodsReportKpis([])).toEqual({ total: 0, inbound: 0, outbound: 0, lateRate: 0 })
  })
})

describe("goods records search and sort", () => {
  it("matches counterparty, reference, plate, driver and scope fields", () => {
    const searchable = [movement("plate", "INBOUND", "2026-08-10", { companyId: "bplas", facilityId: "bplas-merkez", referenceNumber: "REF-42", actualPlate: "16 ABC 16", actualDriverName: "Mehmet Kaya" })]
    expect(searchGoodsReportRecords(searchable, "mehmet")).toHaveLength(1)
    expect(searchGoodsReportRecords(searchable, "ref-42")).toHaveLength(1)
    expect(searchGoodsReportRecords(searchable, "16 abc")).toHaveLength(1)
    expect(searchGoodsReportRecords(searchable, "BPLAS-MERKEZ")).toHaveLength(1)
  })

  it("sorts date and keeps null actual times deterministic", () => {
    expect(ids(sortGoodsReportRecords(movements, { field: "planned", direction: "asc" }))).toEqual(["1", "2", "3"])
    expect(ids(sortGoodsReportRecords(movements, { field: "actual", direction: "desc" }))).toEqual(["1", "2", "3"])
  })
})

describe("goods movement trend analysis", () => {
  const trendFilters = { ...baseFilters, startDate: "2026-08-10", endDate: "2026-08-17" }
  const trendMovements = [
    movement("in-1", "INBOUND", "2026-08-10", { companyId: "bplas", facilityId: "bplas-merkez", plannedTime: "08:30" }),
    movement("out-1", "OUTBOUND", "2026-08-10", { companyId: "bplas", facilityId: "bplas-merkez", plannedTime: "10:00" }),
    movement("in-2", "INBOUND", "2026-08-17", { companyId: "bplas", facilityId: "bplas-merkez", plannedTime: "10:45" }),
  ]

  it("aggregates daily buckets with inbound and outbound directions", () => {
    const daily = calculateGoodsMovementTrend(trendMovements, trendFilters, "daily")
    expect(daily).toHaveLength(8)
    expect(daily[0]).toMatchObject({ label: "10 Ağu", INBOUND: 1, OUTBOUND: 1 })
    expect(daily[1]).toMatchObject({ INBOUND: 0, OUTBOUND: 0 })
  })

  it("aggregates bounded seven-day weekly buckets", () => {
    const weekly = calculateGoodsMovementTrend(trendMovements, trendFilters, "weekly")
    expect(weekly).toHaveLength(2)
    expect(weekly[0]).toMatchObject({ INBOUND: 1, OUTBOUND: 1, periodDayCount: 7 })
    expect(weekly[1]).toMatchObject({ INBOUND: 1, OUTBOUND: 0, periodDayCount: 1 })
  })

  it("uses hourly buckets for a single-day analysis", () => {
    const hourly = calculateGoodsMovementTrend(trendMovements.slice(0, 2), { ...baseFilters, startDate: "2026-08-10", endDate: "2026-08-10" }, "hourly")
    expect(hourly.map((item) => item.label)).toEqual(["08:00", "09:00", "10:00"])
    expect(hourly[0].INBOUND).toBe(1)
    expect(hourly[2].OUTBOUND).toBe(1)
  })

  it("retains movements without a planned time in an explicit hourly bucket", () => {
    const hourly = calculateGoodsMovementTrend([movement("unknown-time", "INBOUND", "2026-08-10", { companyId: "bplas", facilityId: "bplas-merkez" })], { ...baseFilters, startDate: "2026-08-10", endDate: "2026-08-10" }, "hourly")
    expect(hourly).toEqual([{ date: "hour-unscheduled", label: "Saat yok", INBOUND: 1, OUTBOUND: 0 }])
  })

  it("calculates an honest shared comparison scale", () => {
    const scale = calculateSharedGoodsTrendYAxis([{ date: "a", label: "A", INBOUND: 1, OUTBOUND: 2 }], [{ date: "b", label: "B", INBOUND: 5, OUTBOUND: 2 }])
    expect(scale.max).toBeGreaterThanOrEqual(7)
    expect(scale.ticks.at(-1)).toBe(scale.max)
  })
})

describe("goods workspace and summary helpers", () => {
  it("keeps the goods workspace isolated in its own URL keys", () => {
    const state = parseGoodsReportWorkspace(new URLSearchParams("view=records&page=3&goodsView=records&goodsPage=2"))
    expect(state).toEqual({ view: "records", page: 2, search: "", sort: null })
    const recordsSearch = setGoodsReportWorkspace(new URLSearchParams("view=records&page=3"), { view: "records" })
    expect(recordsSearch.toString()).toBe("view=records&page=3&goodsView=records")
    expect(setGoodsReportPage(recordsSearch, 4).get("goodsPage")).toBe("4")
  })

  it("formats deltas and produces deterministic insights", () => {
    expect(formatGoodsReportDelta(12, 8)).toEqual({ difference: 4, label: "+4" })
    expect(buildGoodsInsight({ kpis: { total: 5, inbound: 3, outbound: 2, lateRate: 20 }, trend: [{ date: "2026-08-10", label: "10 Ağu", INBOUND: 3, OUTBOUND: 2 }] }, { total: 3, inbound: 1, outbound: 2, lateRate: 0 })).toContain("En yoğun gün 10 Ağu oldu.")
  })

  it("accepts Enter and Space for record rows", () => {
    expect(isGoodsRecordActivationKey("Enter")).toBe(true)
    expect(isGoodsRecordActivationKey(" ")).toBe(true)
    expect(isGoodsRecordActivationKey("Escape")).toBe(false)
  })
})

describe("goods report pagination", () => {
  it("paginates using the shared pagination helpers", () => {
    const records = Array.from({ length: 25 }, (_, index) => ({ id: String(index) }))
    expect(GOODS_REPORT_PAGE_SIZE).toBe(10)
    expect(getGoodsReportPageCount(records.length)).toBe(3)
    expect(paginateGoodsReport(records as GoodsMovement[], 1)).toHaveLength(10)
    expect(paginateGoodsReport(records as GoodsMovement[], 3)).toHaveLength(5)
  })
})

function ids(records: GoodsMovement[]) {
  return records.map((record) => record.id)
}

function movement(id: string, direction: GoodsMovement["direction"], plannedDate: string, overrides: {
  companyId: string
  facilityId: string
  status?: GoodsMovement["status"]
  plannedTime?: string
  referenceNumber?: string
  actualPlate?: string
  actualDriverName?: string
}): GoodsMovement {
  return {
    id,
    direction,
    companyId: overrides.companyId,
    companyName: overrides.companyId,
    facilityId: overrides.facilityId,
    facilityName: overrides.facilityId,
    counterpartyName: "Test Tedarikçi",
    plannedDate,
    plannedTime: overrides.plannedTime,
    goodsDescription: "Test kalemi",
    referenceNumber: overrides.referenceNumber,
    actualPlate: overrides.actualPlate,
    actualDriverName: overrides.actualDriverName,
    status: overrides.status ?? "PLANNED",
    createdAt: `${plannedDate}T08:00:00+03:00`,
  }
}

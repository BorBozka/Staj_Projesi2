import { describe, expect, it } from "vitest"

import type { GoodsMovement } from "@/domain/goods-movements"
import type { ReportsScopeFilters } from "@/features/reports/reports-filters"
import {
  calculateGoodsReportKpis,
  filterGoodsMovementsForReport,
  getGoodsReportPageCount,
  GOODS_REPORT_PAGE_SIZE,
  paginateGoodsReport,
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
    status: overrides.status ?? "PLANNED",
    createdAt: `${plannedDate}T08:00:00+03:00`,
  }
}

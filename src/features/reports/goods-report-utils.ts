import { endOfDay, parse, startOfDay } from "date-fns"

import { getGoodsMovementDisplayStatus, type GoodsMovement } from "@/domain/goods-movements"
import type { ReportsScopeFilters } from "@/features/reports/reports-filters"
import { getPageCount as getPageCountShared, paginate } from "@/lib/pagination"

export const GOODS_REPORT_PAGE_SIZE = 10

export const GOODS_REPORT_STATUS_LABELS: Record<ReturnType<typeof getGoodsMovementDisplayStatus>, string> = {
  PLANNED: "Planlandı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
  LATE: "Gecikti",
}

function toLocalDate(value: string) {
  return parse(value, "yyyy-MM-dd", new Date())
}

export function filterGoodsMovementsForReport(movements: GoodsMovement[], filters: ReportsScopeFilters): GoodsMovement[] {
  const rangeStart = filters.startDate ? startOfDay(toLocalDate(filters.startDate)) : null
  const rangeEnd = filters.endDate ? endOfDay(toLocalDate(filters.endDate)) : null

  const filtered = movements.filter((movement) => {
    const planned = new Date(`${movement.plannedDate}T12:00:00`)
    return (filters.companyId === "all" || movement.companyId === filters.companyId)
      && (filters.facilityId === "all" || movement.facilityId === filters.facilityId)
      && (!rangeStart || planned >= rangeStart)
      && (!rangeEnd || planned <= rangeEnd)
  })

  return [...filtered].sort((left, right) => `${right.plannedDate}${right.plannedTime ?? ""}`.localeCompare(`${left.plannedDate}${left.plannedTime ?? ""}`))
}

export interface GoodsReportKpis {
  total: number
  inbound: number
  outbound: number
  lateRate: number
}

export function calculateGoodsReportKpis(movements: GoodsMovement[]): GoodsReportKpis {
  const total = movements.length
  const inbound = movements.filter((movement) => movement.direction === "INBOUND").length
  const outbound = movements.filter((movement) => movement.direction === "OUTBOUND").length
  const late = movements.filter((movement) => getGoodsMovementDisplayStatus(movement) === "LATE").length
  const lateRate = total === 0 ? 0 : (late / total) * 100

  return { total, inbound, outbound, lateRate }
}

export function paginateGoodsReport(movements: GoodsMovement[], page: number, pageSize = GOODS_REPORT_PAGE_SIZE) {
  return paginate(movements, page, pageSize)
}

export function getGoodsReportPageCount(total: number, pageSize = GOODS_REPORT_PAGE_SIZE) {
  return getPageCountShared(total, pageSize)
}

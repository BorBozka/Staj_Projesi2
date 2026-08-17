import { getGoodsDirectionLabel, getGoodsMovementDisplayStatus, type GoodsMovement } from "@/domain/goods-movements"

export type SortField = "direction" | "counterparty" | "goods" | "companyFacility" | "plannedAt" | "actualAt" | "status"
export type Sort = { field: SortField; direction: "asc" | "desc" }
export const GOODS_PAGE_SIZE = 9

const turkishCollator = new Intl.Collator("tr-TR", { numeric: true, sensitivity: "base" })

export function toggleGoodsSort(sorts: Sort[], field: SortField): Sort[] {
  const existing = sorts.find((sort) => sort.field === field)
  if (!existing) return [...sorts, { field, direction: "asc" }]
  if (existing.direction === "asc") return sorts.map((sort) => sort.field === field ? { ...sort, direction: "desc" } : sort)
  return sorts.filter((sort) => sort.field !== field)
}

export function sortGoodsMovements(movements: GoodsMovement[], sorts: Sort[]): GoodsMovement[] {
  if (sorts.length === 0) return movements
  return [...movements].sort((left, right) => {
    for (const sort of sorts) {
      const result = compareGoodsMovements(left, right, sort.field)
      if (result !== 0) return sort.direction === "asc" ? result : -result
    }
    return 0
  })
}

export function paginateGoodsMovements(movements: GoodsMovement[], page: number, pageSize = GOODS_PAGE_SIZE) {
  const start = (page - 1) * pageSize
  return movements.slice(start, start + pageSize)
}

export function getGoodsPageCount(total: number, pageSize = GOODS_PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize))
}

export function getVisibleGoodsPageNumbers(page: number, pageCount: number) {
  const start = Math.max(1, Math.min(page - 1, pageCount - 2))
  return Array.from({ length: Math.min(3, pageCount) }, (_, index) => start + index)
}

function compareGoodsMovements(left: GoodsMovement, right: GoodsMovement, field: SortField): number {
  const leftValue = goodsSortValue(left, field)
  const rightValue = goodsSortValue(right, field)
  if (typeof leftValue === "number" && typeof rightValue === "number") return leftValue - rightValue
  return turkishCollator.compare(String(leftValue), String(rightValue))
}

function goodsSortValue(movement: GoodsMovement, field: SortField): number | string {
  if (field === "plannedAt") return `${movement.plannedDate}${movement.plannedTime ?? ""}`
  if (field === "actualAt") return movement.actualAt ? new Date(movement.actualAt).getTime() : Number.POSITIVE_INFINITY
  if (field === "direction") return getGoodsDirectionLabel(movement.direction)
  if (field === "counterparty") return movement.counterpartyName
  if (field === "goods") return movement.goodsDescription
  if (field === "companyFacility") return `${movement.companyName} ${movement.facilityName}`
  return getGoodsMovementDisplayStatus(movement)
}

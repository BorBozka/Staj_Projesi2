import { format, parse } from "date-fns"

import type { GoodsMovement } from "@/domain/goods-movements"
import { formatTr } from "@/lib/date"

export interface SecurityGoodsMovementScope {
  companyId: string
  facilityId: string
}

export function formatSecurityGoodsMovementPlannedAt(movement: Pick<GoodsMovement, "plannedDate" | "plannedTime">, now = new Date()): string {
  const date = parse(movement.plannedDate, "yyyy-MM-dd", new Date())
  const dateLabel = movement.plannedDate === formatTr(now, "yyyy-MM-dd") ? "Bugün" : formatTr(date, "d MMM yyyy")
  return `${dateLabel} · ${movement.plannedTime ?? "Saat belirtilmedi"}`
}

export interface SecurityGoodsMovementRow {
  movement: GoodsMovement
  isLate: boolean
}

export interface SecurityGoodsMovementGroups {
  late: SecurityGoodsMovementRow[]
  upcoming: SecurityGoodsMovementRow[]
}

export interface SecurityGoodsMovementPanels {
  inbound: SecurityGoodsMovementGroups
  outbound: SecurityGoodsMovementGroups
}

export function getSecurityScopedTodayPlannedGoodsMovements(movements: GoodsMovement[], scope: SecurityGoodsMovementScope, now: Date) {
  const today = format(now, "yyyy-MM-dd")
  return movements.filter((movement) =>
    movement.status === "PLANNED"
    && movement.companyId === scope.companyId
    && movement.facilityId === scope.facilityId
    && movement.plannedDate === today,
  )
}

export function filterSecurityGoodsMovements(movements: GoodsMovement[], search: string) {
  const query = normalizeTurkishSearch(search)
  if (!query) return movements

  return movements.filter((movement) => normalizeTurkishSearch([
    movement.counterpartyName,
    movement.goodsDescription,
    movement.referenceNumber ?? "",
  ].join(" ")).includes(query))
}

export function groupSecurityGoodsMovements(movements: GoodsMovement[], now: Date): SecurityGoodsMovementPanels {
  const rows = movements.map((movement) => ({
    movement,
    isLate: Boolean(movement.plannedTime) && getPlannedTime(movement) < now.getTime(),
  }))
  return {
    inbound: groupDirection(rows.filter((row) => row.movement.direction === "INBOUND")),
    outbound: groupDirection(rows.filter((row) => row.movement.direction === "OUTBOUND")),
  }
}

function groupDirection(rows: SecurityGoodsMovementRow[]): SecurityGoodsMovementGroups {
  const late = rows.filter((row) => row.isLate).sort(compareByPlannedTime)
  const upcoming = rows.filter((row) => !row.isLate).sort(compareByPlannedTime)
  return { late, upcoming }
}

function compareByPlannedTime(left: SecurityGoodsMovementRow, right: SecurityGoodsMovementRow) {
  const leftTime = left.movement.plannedTime
  const rightTime = right.movement.plannedTime
  if (!leftTime && !rightTime) return left.movement.id.localeCompare(right.movement.id)
  if (!leftTime) return 1
  if (!rightTime) return -1
  return leftTime.localeCompare(rightTime) || left.movement.id.localeCompare(right.movement.id)
}

function getPlannedTime(movement: GoodsMovement) {
  return new Date(`${movement.plannedDate}T${movement.plannedTime}:00`).getTime()
}

function normalizeTurkishSearch(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR")
}

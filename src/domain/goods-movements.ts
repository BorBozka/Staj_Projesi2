export const goodsMovementDirections = ["INBOUND", "OUTBOUND"] as const
export type GoodsMovementDirection = (typeof goodsMovementDirections)[number]
export const goodsMovementStatuses = ["PLANNED", "COMPLETED", "CANCELLED"] as const
export type GoodsMovementStatus = (typeof goodsMovementStatuses)[number]

export interface GoodsMovement {
  id: string
  direction: GoodsMovementDirection
  companyId: string
  companyName: string
  facilityId: string
  facilityName: string
  counterpartyName: string
  plannedDate: string
  plannedTime?: string
  goodsDescription: string
  referenceNumber?: string
  note?: string
  status: GoodsMovementStatus
  actualAt?: string
  actualPlate?: string
  actualDriverName?: string
  createdAt: string
}

export interface GoodsMovementInput {
  direction: GoodsMovementDirection
  companyId: string
  facilityId: string
  counterpartyName: string
  plannedDate: string
  plannedTime?: string
  goodsDescription: string
  referenceNumber?: string
  note?: string
}

export function getGoodsDirectionLabel(direction: GoodsMovementDirection) { return direction === "INBOUND" ? "Gelen" : "Giden" }
export function getGoodsCounterpartyLabel(direction: GoodsMovementDirection) { return direction === "INBOUND" ? "Gönderen firma" : "Alıcı firma" }
export function getGoodsCompletionLabel(direction: GoodsMovementDirection) { return direction === "INBOUND" ? "Geldi" : "Çıkış yaptı" }
export function getGoodsMovementDisplayStatus(movement: GoodsMovement, now = new Date()) {
  if (movement.status === "PLANNED" && movement.plannedTime && new Date(`${movement.plannedDate}T${movement.plannedTime}`) < now) return "LATE" as const
  return movement.status
}

import type { GoodsMovement, GoodsMovementInput } from "@/domain/goods-movements"

export interface CompleteGoodsMovementInput {
  /** Security's resolved authorization scope; never chosen from the operations UI. */
  companyId: string
  facilityId: string
  actualPlate?: string
  actualDriverName?: string
}

export interface GoodsMovementService {
  listGoodsMovements(): Promise<GoodsMovement[]>
  createGoodsMovement(input: GoodsMovementInput): Promise<GoodsMovement>
  updateGoodsMovement(id: string, input: GoodsMovementInput): Promise<GoodsMovement>
  cancelGoodsMovement(id: string): Promise<GoodsMovement>
  /** Security desk operation. Only a scoped PLANNED record may be completed. */
  completeGoodsMovement(id: string, input: CompleteGoodsMovementInput): Promise<GoodsMovement>
}

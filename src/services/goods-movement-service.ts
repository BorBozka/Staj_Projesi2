import type { GoodsMovement, GoodsMovementInput } from "@/domain/goods-movements"

export interface GoodsMovementService {
  listGoodsMovements(): Promise<GoodsMovement[]>
  createGoodsMovement(input: GoodsMovementInput): Promise<GoodsMovement>
  updateGoodsMovement(id: string, input: GoodsMovementInput): Promise<GoodsMovement>
  cancelGoodsMovement(id: string): Promise<GoodsMovement>
}

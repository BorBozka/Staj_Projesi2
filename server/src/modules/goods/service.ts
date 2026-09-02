import { ApiError } from "../../lib/api-error.js"
import { isWithinAuthorizationScope, type AuthorizationScope } from "../../lib/scope.js"
import type { GoodsMovementRepository, PersistGoodsMovementInput } from "../../repositories/goods-movement-repository.js"
import {
  GOODS_DATE_PATTERN,
  GOODS_TIME_PATTERN,
  goodsMovementDirections,
  normalizeOptionalText,
  type CompleteGoodsMovementInput,
  type GoodsMovementInput,
} from "./types.js"

const STATE_CONFLICT = "GOODS_MOVEMENT_NOT_EDITABLE"

export class GoodsMovementService {
  constructor(
    private readonly repository: GoodsMovementRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  list() {
    return this.repository.list()
  }

  async create(input: GoodsMovementInput) {
    return this.repository.create(await this.validate(input))
  }

  async update(id: string, input: GoodsMovementInput) {
    const current = await this.require(id)
    if (current.status !== "PLANNED") throw new ApiError(409, STATE_CONFLICT, "Bu kayıt artık düzenlenemez.")
    const result = await this.repository.update(id, await this.validate(input))
    if (!result) throw new ApiError(409, STATE_CONFLICT, "Bu kayıt artık düzenlenemez.")
    return result
  }

  async cancel(id: string) {
    const current = await this.require(id)
    if (current.status !== "PLANNED") throw new ApiError(409, STATE_CONFLICT, "Bu kayıt iptal edilemez.")
    const result = await this.repository.cancel(id)
    if (!result) throw new ApiError(409, STATE_CONFLICT, "Bu kayıt iptal edilemez.")
    return result
  }

  /**
   * Security operational list: today's PLANNED movements limited to the authenticated Security
   * user's authorization scope. Both directions are returned as canonical records; grouping,
   * search and sorting stay on the operations UI.
   */
  async listSecurityOperational(userId: string) {
    const scope = await this.requireScope(userId)
    const today = toLocalDateKey(this.now())
    return (await this.repository.list()).filter((movement) =>
      movement.status === "PLANNED"
      && movement.plannedDate === today
      && isWithinAuthorizationScope(scope, { companyId: movement.companyId, facilityId: movement.facilityId }),
    )
  }

  async complete(id: string, userId: string, input: CompleteGoodsMovementInput) {
    const scope = await this.requireScope(userId)
    const current = await this.require(id)
    if (current.status !== "PLANNED") {
      throw new ApiError(409, STATE_CONFLICT, "Yalnızca planlanmış mal hareketleri tamamlanabilir.")
    }
    // The frontend-supplied context must be one the Security user is actually authorized for,
    // and the movement itself must belong to that same verified company/facility.
    const claimedInScope = isWithinAuthorizationScope(scope, { companyId: input.companyId, facilityId: input.facilityId })
    const movementMatchesClaim = current.companyId === input.companyId && current.facilityId === input.facilityId
    const movementInScope = isWithinAuthorizationScope(scope, { companyId: current.companyId, facilityId: current.facilityId })
    if (!claimedInScope || !movementMatchesClaim || !movementInScope) {
      throw new ApiError(403, "GOODS_MOVEMENT_OUT_OF_SCOPE", "Bu mal hareketi yetki kapsamınız dışında.")
    }
    const result = await this.repository.complete(id, {
      actualAt: this.now(),
      actualPlate: normalizeOptionalText(input.actualPlate),
      actualDriverName: normalizeOptionalText(input.actualDriverName),
    })
    if (!result) throw new ApiError(409, STATE_CONFLICT, "Yalnızca planlanmış mal hareketleri tamamlanabilir.")
    return result
  }

  private async require(id: string) {
    const movement = await this.repository.find(id)
    if (!movement) throw new ApiError(404, "NOT_FOUND", "Mal hareketi bulunamadı.")
    return movement
  }

  private async requireScope(userId: string): Promise<AuthorizationScope> {
    const scope = await this.repository.findUserScope(userId)
    if (!scope) throw new ApiError(403, "GOODS_MOVEMENT_OUT_OF_SCOPE", "Kullanıcı yetki kapsamı çözülemedi.")
    return scope
  }

  private async validate(input: GoodsMovementInput): Promise<PersistGoodsMovementInput> {
    const counterpartyName = input.counterpartyName?.trim()
    const goodsDescription = input.goodsDescription?.trim()
    if (!counterpartyName || !goodsDescription) {
      throw new ApiError(400, "VALIDATION_ERROR", "Karşı firma ve mal/açıklama zorunludur.")
    }
    if (
      !goodsMovementDirections.includes(input.direction)
      || !GOODS_DATE_PATTERN.test(input.plannedDate)
      || Number.isNaN(new Date(`${input.plannedDate}T12:00:00`).getTime())
    ) {
      throw new ApiError(400, "VALIDATION_ERROR", "Yön ve planlanan tarih zorunludur.")
    }
    const plannedTime = normalizeOptionalText(input.plannedTime)
    if (plannedTime && !GOODS_TIME_PATTERN.test(plannedTime)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Planlanan saat geçersiz.")
    }
    if (!(await this.repository.companyAndFacilityMatch(input.companyId, input.facilityId))) {
      throw new ApiError(400, "INVALID_SCOPE", "Şirket ve tesis eşleşmesi geçersiz.")
    }
    return {
      direction: input.direction,
      companyId: input.companyId,
      facilityId: input.facilityId,
      counterpartyName,
      plannedDate: input.plannedDate,
      plannedTime,
      goodsDescription,
      referenceNumber: normalizeOptionalText(input.referenceNumber),
      note: normalizeOptionalText(input.note),
    }
  }
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

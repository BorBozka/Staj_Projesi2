import type { GoodsMovement, GoodsMovementInput } from "@/domain/goods-movements"
import { initialMockGoodsMovements } from "@/services/mock-goods-movement-data"
import type { CompleteGoodsMovementInput, GoodsMovementService } from "@/services/goods-movement-service"
import type { VisitService } from "@/services/visit-service"

const clone = <T,>(value: T): T => structuredClone(value)
export class MockGoodsMovementService implements GoodsMovementService {
  private movements = clone(initialMockGoodsMovements)
  constructor(private readonly visitService: VisitService) {}
  async listGoodsMovements() { return clone(this.movements).sort((a, b) => `${b.plannedDate}${b.plannedTime ?? ""}`.localeCompare(`${a.plannedDate}${a.plannedTime ?? ""}`)) }
  async createGoodsMovement(input: GoodsMovementInput) { const movement = await this.validate(input); this.movements = [...this.movements, movement]; return clone(movement) }
  async updateGoodsMovement(id: string, input: GoodsMovementInput) { const current = this.find(id); if (current.status !== "PLANNED") throw new Error("Bu kayıt artık düzenlenemez."); const movement = await this.validate(input, current); this.movements = this.movements.map((item) => item.id === id ? movement : item); return clone(movement) }
  async cancelGoodsMovement(id: string) { const current = this.find(id); if (current.status !== "PLANNED") throw new Error("Bu kayıt iptal edilemez."); const movement = { ...current, status: "CANCELLED" as const }; this.movements = this.movements.map((item) => item.id === id ? movement : item); return clone(movement) }
  async completeGoodsMovement(id: string, input: CompleteGoodsMovementInput) {
    const current = this.find(id)
    if (current.status !== "PLANNED") throw new Error("Yalnızca planlanmış mal hareketleri tamamlanabilir.")
    if (current.companyId !== input.companyId || current.facilityId !== input.facilityId) throw new Error("Bu mal hareketi Security kapsamı dışında.")

    const actualPlate = input.actualPlate?.trim()
    const actualDriverName = input.actualDriverName?.trim()
    const completed: GoodsMovement = {
      ...current,
      status: "COMPLETED",
      actualAt: new Date().toISOString(),
      ...(actualPlate ? { actualPlate } : {}),
      ...(actualDriverName ? { actualDriverName } : {}),
    }
    this.movements = this.movements.map((item) => item.id === id ? completed : item)
    return clone(completed)
  }
  private find(id: string) { const movement = this.movements.find((item) => item.id === id); if (!movement) throw new Error("Mal hareketi bulunamadı."); return movement }
  private async validate(input: GoodsMovementInput, current?: GoodsMovement): Promise<GoodsMovement> {
    if (!input.counterpartyName.trim() || !input.goodsDescription.trim()) throw new Error("Karşı firma ve mal/açıklama zorunludur.")
    if (!input.direction || !/^\d{4}-\d{2}-\d{2}$/.test(input.plannedDate) || Number.isNaN(new Date(`${input.plannedDate}T12:00:00`).getTime())) throw new Error("Yön ve planlanan tarih zorunludur.")
    if (input.plannedTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.plannedTime)) throw new Error("Planlanan saat geçersiz.")
    const references = await this.visitService.getReferenceData()
    const company = references.companies.find((item) => item.id === input.companyId)
    const facility = references.facilities.find((item) => item.id === input.facilityId && item.companyId === input.companyId)
    if (!company || !facility) throw new Error("Şirket ve tesis eşleşmesi geçersiz.")
    return { id: current?.id ?? `goods-${crypto.randomUUID()}`, direction: input.direction, companyId: company.id, companyName: company.name, facilityId: facility.id, facilityName: facility.name, counterpartyName: input.counterpartyName.trim(), plannedDate: input.plannedDate, ...(input.plannedTime ? { plannedTime: input.plannedTime } : {}), goodsDescription: input.goodsDescription.trim(), ...(input.referenceNumber?.trim() ? { referenceNumber: input.referenceNumber.trim() } : {}), ...(input.note?.trim() ? { note: input.note.trim() } : {}), status: current?.status ?? "PLANNED", ...(current?.actualAt ? { actualAt: current.actualAt, actualPlate: current.actualPlate, actualDriverName: current.actualDriverName } : {}), createdAt: current?.createdAt ?? new Date().toISOString() }
  }
}

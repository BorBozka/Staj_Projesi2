import { isVisitTypeNameTaken, type VisitTypeDefinition } from "@/domain/admin"

const clone = <T,>(value: T): T => structuredClone(value)

/**
 * Seed IDs are the IDs already referenced by the seeded visits in
 * `mock-visit-data.ts` (`typeId`). This is the sole editable visit-type state in
 * the mock application; both MockVisitService and MockAdminService share one
 * instance so Admin edits reach the visit form and visit service immediately.
 *
 * `interview` ships inactive on purpose: a seeded visit references it, which lets
 * us verify that an inactive type still resolves on existing visits.
 */
export const initialMockVisitTypes: VisitTypeDefinition[] = [
  { id: "meeting", name: "Toplantı", active: true },
  { id: "technical-service", name: "Teknik Servis / Bakım", active: true },
  { id: "supplier", name: "Tedarikçi", active: true },
  { id: "interview", name: "İş Görüşmesi", active: false },
  { id: "audit", name: "Denetim", active: true },
  { id: "customer", name: "Müşteri Ziyareti", active: true },
  { id: "training", name: "Eğitim", active: true },
]

export class MockVisitTypeStore {
  private visitTypes: VisitTypeDefinition[]

  constructor(initial: VisitTypeDefinition[] = initialMockVisitTypes) {
    this.visitTypes = clone(initial)
  }

  getAll(): VisitTypeDefinition[] {
    return clone(this.visitTypes)
  }

  save(input: Omit<VisitTypeDefinition, "id"> & { id?: string }): VisitTypeDefinition {
    const existing = input.id ? this.visitTypes.find((visitType) => visitType.id === input.id) : undefined
    if (input.id && !existing) throw new Error("Ziyaret türü bulunamadı.")

    const name = input.name.trim()
    if (!name) throw new Error("Ziyaret türü adı boş olamaz.")
    if (isVisitTypeNameTaken(this.visitTypes, existing?.id ?? null, name)) throw new Error("Bu ziyaret türü zaten tanımlı.")

    const entity: VisitTypeDefinition = {
      id: existing?.id ?? `type-${crypto.randomUUID()}`,
      name,
      active: input.active,
    }
    this.visitTypes = existing
      ? this.visitTypes.map((item) => item.id === existing.id ? entity : item)
      : [...this.visitTypes, entity]
    return clone(entity)
  }
}

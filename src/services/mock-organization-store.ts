import {
  normalizeOrganizationName,
  organizationSnapshotKeyByKind,
  type OrganizationEntity,
  type OrganizationKind,
  type OrganizationSnapshot,
} from "@/domain/organization"

const clone = <T,>(value: T): T => structuredClone(value)

/**
 * Seed IDs are the IDs already used by visits, reporting, fleet, and goods records.
 * This is the sole editable organization state in the mock application.
 */
export const initialMockOrganizationSnapshot: OrganizationSnapshot = {
  companies: [
    { id: "bplas", name: "BPLAS A.Ş.", active: true },
    { id: "bplas-otomotiv", name: "BPLAS Otomotiv A.Ş.", active: true },
    { id: "anadolu-lojistik", name: "Anadolu Lojistik A.Ş.", active: true },
  ],
  facilities: [
    { id: "bplas-merkez", parentId: "bplas", name: "Merkez Tesis", active: true },
    { id: "bplas-arge", parentId: "bplas", name: "Ar-Ge Merkezi", active: true },
    { id: "otomotiv-uretim", parentId: "bplas-otomotiv", name: "Üretim Tesisi", active: true },
    { id: "anadolu-lojistik-merkez", parentId: "anadolu-lojistik", name: "Lojistik Merkezi", active: true },
  ],
  departments: [
    { id: "department-bplas-yonetim", parentId: "bplas", name: "Yönetim", active: true },
    { id: "department-bplas-satin-alma", parentId: "bplas", name: "Satın Alma", active: true },
    { id: "department-bplas-muhendislik", parentId: "bplas", name: "Mühendislik", active: true },
    { id: "department-bplas-otomotiv-uretim", parentId: "bplas-otomotiv", name: "Üretim", active: true },
    { id: "department-anadolu-lojistik-operasyon", parentId: "anadolu-lojistik", name: "Operasyon", active: true },
  ],
  securityGates: [
    { id: "gate-bplas-merkez-ana-giris", parentId: "bplas-merkez", name: "Ana Giriş", active: true },
    { id: "gate-bplas-merkez-lojistik", parentId: "bplas-merkez", name: "Lojistik Kapısı", active: true },
    { id: "gate-bplas-arge-ziyaretci", parentId: "bplas-arge", name: "Ziyaretçi Girişi", active: true },
    { id: "gate-bplas-arge-eski-giris", parentId: "bplas-arge", name: "Eski Giriş", active: false },
    { id: "gate-otomotiv-ana-giris", parentId: "otomotiv-uretim", name: "Ana Giriş", active: true },
    { id: "gate-anadolu-lojistik-ana-giris", parentId: "anadolu-lojistik-merkez", name: "Ana Giriş", active: true },
  ],
}

export class MockOrganizationStore {
  private organization: OrganizationSnapshot

  constructor(initial: OrganizationSnapshot = initialMockOrganizationSnapshot) {
    this.organization = clone(initial)
  }

  getSnapshot(): OrganizationSnapshot {
    return clone(this.organization)
  }

  save(kind: OrganizationKind, input: Omit<OrganizationEntity, "id"> & { id?: string }): OrganizationEntity {
    const key = organizationSnapshotKeyByKind[kind]
    const existing = input.id ? this.organization[key].find((entity) => entity.id === input.id) : undefined
    if (input.id && !existing) throw new Error("Organizasyon kaydı bulunamadı.")

    const name = input.name.trim()
    if (!name) throw new Error("Organizasyon adı zorunludur.")
    const parentId = this.validateParent(kind, input.parentId, input.active, existing)
    this.assertUniqueName(kind, existing?.id ?? null, name, parentId)

    const entity: OrganizationEntity = {
      id: existing?.id ?? `${kind.toLowerCase()}-${crypto.randomUUID()}`,
      name,
      active: input.active,
      ...(parentId ? { parentId } : {}),
    }

    if (existing && existing.active && !entity.active) this.assertCanDeactivate(kind, existing.id)
    this.organization[key] = existing
      ? this.organization[key].map((item) => item.id === existing.id ? entity : item) as never
      : [...this.organization[key], entity] as never
    return clone(entity)
  }

  private validateParent(
    kind: OrganizationKind,
    requestedParentId: string | undefined,
    active: boolean,
    existing: OrganizationEntity | undefined,
  ) {
    if (kind === "COMPANY") {
      if (requestedParentId) throw new Error("Şirket kaydının üst organizasyonu olamaz.")
      return undefined
    }

    if (existing && requestedParentId !== existing.parentId) {
      throw new Error("Mevcut organizasyon kaydının üst ilişkisi değiştirilemez.")
    }
    if (!requestedParentId) throw new Error("Üst organizasyon seçilmelidir.")

    const parent = kind === "SECURITY_GATE"
      ? this.organization.facilities.find((entity) => entity.id === requestedParentId)
      : this.organization.companies.find((entity) => entity.id === requestedParentId)
    if (!parent) throw new Error("Üst organizasyon kaydı bulunamadı.")
    if (active && !parent.active) throw new Error("Pasif üst organizasyon altında aktif kayıt bulunamaz.")
    return requestedParentId
  }

  private assertUniqueName(kind: OrganizationKind, excludeId: string | null, name: string, parentId: string | undefined) {
    const normalizedName = normalizeOrganizationName(name)
    const key = organizationSnapshotKeyByKind[kind]
    const duplicate = this.organization[key].some((entity) =>
      entity.id !== excludeId
      && normalizeOrganizationName(entity.name) === normalizedName
      && (kind === "COMPANY" || entity.parentId === parentId),
    )
    if (duplicate) throw new Error("Bu kapsamda aynı ada sahip bir organizasyon kaydı zaten var.")
  }

  private assertCanDeactivate(kind: OrganizationKind, id: string) {
    const activeChildren = kind === "COMPANY"
      ? [...this.organization.facilities, ...this.organization.departments].some((entity) => entity.parentId === id && entity.active)
      : kind === "FACILITY"
        ? this.organization.securityGates.some((entity) => entity.parentId === id && entity.active)
        : false
    if (activeChildren) throw new Error("Aktif alt kayıtları bulunan organizasyon kaydı pasife alınamaz.")
  }
}

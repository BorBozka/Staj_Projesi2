import { ApiError } from "../../lib/api-error.js"
import type { OrganizationRepository } from "../../repositories/organization-repository.js"
import { normalizeOrganizationName, type OrganizationEntity, type OrganizationKind, type OrganizationSnapshot, type SaveOrganizationInput } from "./types.js"

const parentKind: Record<Exclude<OrganizationKind, "COMPANY">, OrganizationKind> = { FACILITY: "COMPANY", DEPARTMENT: "COMPANY", SECURITY_GATE: "FACILITY" }

export class OrganizationService {
  constructor(private readonly repository: OrganizationRepository) {}

  async getSnapshot(includeInactive = false): Promise<OrganizationSnapshot> {
    const [companies, facilities, departments, securityGates] = await Promise.all([
      this.repository.list("COMPANY", includeInactive), this.repository.list("FACILITY", includeInactive), this.repository.list("DEPARTMENT", includeInactive), this.repository.list("SECURITY_GATE", includeInactive),
    ])
    return { companies, facilities, departments, securityGates }
  }

  list(kind: OrganizationKind, includeInactive = false) { return this.repository.list(kind, includeInactive) }
  async get(kind: OrganizationKind, id: string) { return this.requireEntity(kind, id) }
  listEmployees(filters: { companyId?: string; facilityId?: string; includeInactive: boolean }) { return this.repository.listEmployees(filters) }
  async getEmployee(id: string) { const employee = await this.repository.findEmployee(id); if (!employee) throw new ApiError(404, "NOT_FOUND", "Çalışan bulunamadı."); return employee }

  async save(kind: OrganizationKind, input: SaveOrganizationInput): Promise<OrganizationEntity> {
    const name = input.name.trim()
    if (!name) throw new ApiError(400, "VALIDATION_ERROR", "Organizasyon adı zorunludur.")
    const existing = input.id ? await this.requireEntity(kind, input.id) : null
    const parentId = await this.validateParent(kind, input.parentId, input.active, existing)
    if (existing && existing.active && !input.active && await this.repository.hasActiveChildren(kind, existing.id)) {
      throw new ApiError(409, "ACTIVE_CHILDREN", "Aktif alt kayıtları bulunan organizasyon kaydı pasife alınamaz.")
    }
    const siblings = await this.repository.list(kind, true)
    if (siblings.some((item) => item.id !== existing?.id && item.parentId === parentId && normalizeOrganizationName(item.name) === normalizeOrganizationName(name))) {
      throw new ApiError(409, "DUPLICATE_NAME", "Bu kapsamda aynı ada sahip bir organizasyon kaydı zaten var.")
    }
    return this.repository.save(kind, { ...input, ...(parentId ? { parentId } : {}), name, nameNormalized: normalizeOrganizationName(name) })
  }

  private async validateParent(kind: OrganizationKind, parentId: string | undefined, active: boolean, existing: OrganizationEntity | null): Promise<string | undefined> {
    if (kind === "COMPANY") {
      if (parentId) throw new ApiError(400, "VALIDATION_ERROR", "Şirket kaydının üst organizasyonu olamaz.")
      return undefined
    }
    if (!parentId) throw new ApiError(400, "VALIDATION_ERROR", "Üst organizasyon seçilmelidir.")
    if (existing && parentId !== existing.parentId) throw new ApiError(409, "PARENT_IMMUTABLE", "Mevcut organizasyon kaydının üst ilişkisi değiştirilemez.")
    const parent = await this.repository.find(parentKind[kind], parentId)
    if (!parent) throw new ApiError(404, "PARENT_NOT_FOUND", "Üst organizasyon kaydı bulunamadı.")
    if (active && !parent.active) throw new ApiError(409, "INACTIVE_PARENT", "Pasif üst organizasyon altında aktif kayıt bulunamaz.")
    return parentId
  }

  private async requireEntity(kind: OrganizationKind, id: string) {
    const entity = await this.repository.find(kind, id)
    if (!entity) throw new ApiError(404, "NOT_FOUND", "Organizasyon kaydı bulunamadı.")
    return entity
  }
}

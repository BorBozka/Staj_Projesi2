import { ApiError } from "../../lib/api-error.js"
import type { ResourceRepository } from "../../repositories/resource-repository.js"
import { normalizeLicensePlate, type FacilityResource, type ResourceInput } from "./types.js"

function normalizeList(values: string[]) { return [...new Set(values.map((value) => value.trim()).filter(Boolean))] }

export class ResourceService {
  constructor(private readonly repository: ResourceRepository) {}
  list(filters: { includeInactive: boolean; companyId?: string; facilityId?: string; type?: string }) { return this.repository.list(filters) }
  async get(id: string) { const resource = await this.repository.find(id); if (!resource) throw new ApiError(404, "NOT_FOUND", "Kaynak bulunamadı."); return resource }
  async create(input: ResourceInput) { const validated = await this.validateInput(input); return this.repository.save(validated) }
  async update(id: string, input: ResourceInput) { const current = await this.get(id); if (current.type !== input.type) throw new ApiError(409, "RESOURCE_TYPE_IMMUTABLE", "Kaynak türü düzenleme sırasında değiştirilemez."); const validated = await this.validateInput(input, id); return this.repository.save(validated, id, current.isActive) }
  async setActive(id: string, active: boolean) { await this.get(id); return this.repository.setActive(id, active) }

  private async validateInput(input: ResourceInput, excludeId?: string): Promise<ResourceInput> {
    if (!await this.repository.companyAndFacilityExist(input.companyId, input.facilityId)) throw new ApiError(400, "INVALID_SCOPE", "Şirket ve tesis eşleşmesi geçersiz.")
    switch (input.type) {
      case "ROOM": { const name = input.name.trim(); if (!name) throw new ApiError(400, "VALIDATION_ERROR", "Kaynak adı zorunludur."); return { ...input, name } }
      case "POOLED_EQUIPMENT": { const name = input.name.trim(); if (!name || !Number.isInteger(input.totalQuantity) || input.totalQuantity <= 0) throw new ApiError(400, "VALIDATION_ERROR", "Kaynak adı ve pozitif ekipman miktarı zorunludur."); return { ...input, name } }
      case "VEHICLE": { const brand = input.brand.trim(); const model = input.model.trim(); const licensePlate = normalizeLicensePlate(input.licensePlate); if (!brand || !model || !licensePlate) throw new ApiError(400, "VALIDATION_ERROR", "Araç markası, modeli ve plakası zorunludur."); if (await this.repository.findVehicleByCompanyAndPlate(input.companyId, licensePlate, excludeId)) throw new ApiError(409, "DUPLICATE_LICENSE_PLATE", "Bu şirket için aynı plakaya sahip bir araç zaten kayıtlı."); return { ...input, brand, model, licensePlate } }
      case "DRIVER": { const fullName = input.fullName.trim(); const licenseClasses = normalizeList(input.licenseClasses); const documents = normalizeList(input.documents); if (!fullName || licenseClasses.length === 0 || typeof input.canDriveCommercialVehicles !== "boolean") throw new ApiError(400, "VALIDATION_ERROR", "Şoför adı, en az bir ehliyet sınıfı ve ticari araç bilgisi zorunludur."); return { ...input, fullName, licenseClasses, documents } }
    }
  }
}

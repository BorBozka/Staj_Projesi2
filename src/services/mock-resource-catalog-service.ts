import { getResourceDisplayName, type FacilityResource, type ResourceInput } from "@/domain/resources"
import { initialMockResources } from "@/services/mock-resource-data"
import { createMockVisitReferenceData } from "@/services/mock-visit-data"
import { MockOrganizationStore } from "@/services/mock-organization-store"
import type { ResourceCatalogService } from "@/services/resource-catalog-service"

const clone = <T,>(value: T): T => structuredClone(value)

export class MockResourceCatalogService implements ResourceCatalogService {
  private resources = clone(initialMockResources)

  constructor(private readonly organizationStore = new MockOrganizationStore()) {}

  async listResources(): Promise<FacilityResource[]> {
    return clone(this.resources).sort((a, b) =>
      a.companyName.localeCompare(b.companyName, "tr")
      || a.facilityName.localeCompare(b.facilityName, "tr")
      || getResourceDisplayName(a).localeCompare(getResourceDisplayName(b), "tr"),
    )
  }

  async createResource(input: ResourceInput): Promise<FacilityResource> {
    const now = new Date().toISOString()
    const resource = this.fromInput(`resource-${crypto.randomUUID()}`, input, true, now, now)
    this.resources = [...this.resources, resource]
    return clone(resource)
  }

  async updateResource(id: string, input: ResourceInput): Promise<FacilityResource> {
    const current = this.findResource(id)
    if (current.type !== input.type) throw new Error("Kaynak türü düzenleme sırasında değiştirilemez.")
    const updated = this.fromInput(id, input, current.isActive, current.createdAt, new Date().toISOString())
    this.resources = this.resources.map((resource) => resource.id === id ? updated : resource)
    return clone(updated)
  }

  async setResourceActive(id: string, isActive: boolean): Promise<FacilityResource> {
    const current = this.findResource(id)
    const updated = { ...current, isActive, updatedAt: new Date().toISOString() }
    this.resources = this.resources.map((resource) => resource.id === id ? updated : resource)
    return clone(updated)
  }

  async deleteResource(id: string): Promise<void> {
    this.findResource(id)
    this.resources = this.resources.filter((resource) => resource.id !== id)
  }

  private findResource(id: string) {
    const resource = this.resources.find((item) => item.id === id)
    if (!resource) throw new Error("Kaynak bulunamadı.")
    return resource
  }

  private fromInput(
    id: string,
    input: ResourceInput,
    isActive: boolean,
    createdAt: string,
    updatedAt: string,
  ): FacilityResource {
    const referenceData = createMockVisitReferenceData(this.organizationStore.getSnapshot(), [])
    const company = referenceData.companies.find((item) => item.id === input.companyId)
    const facility = referenceData.facilities.find(
      (item) => item.id === input.facilityId && item.companyId === input.companyId,
    )
    if (!company || !facility) throw new Error("Şirket ve tesis eşleşmesi geçersiz.")

    const common = {
      id,
      companyId: company.id,
      companyName: company.name,
      facilityId: facility.id,
      facilityName: facility.name,
      isActive,
      createdAt,
      updatedAt,
    }

    switch (input.type) {
      case "ROOM":
      case "POOLED_EQUIPMENT": {
        const name = input.name.trim()
        if (!name) throw new Error("Kaynak adı zorunludur.")
        if (input.type === "POOLED_EQUIPMENT" && (!Number.isInteger(input.totalQuantity) || input.totalQuantity <= 0)) {
          throw new Error("Ekipman havuzu miktarı pozitif bir tam sayı olmalıdır.")
        }
        return input.type === "ROOM"
          ? { ...common, type: "ROOM", name }
          : { ...common, type: "POOLED_EQUIPMENT", name, totalQuantity: input.totalQuantity }
      }
      case "VEHICLE": {
        const brand = input.brand.trim()
        const model = input.model.trim()
        const licensePlate = normalizeLicensePlate(input.licensePlate)
        if (!brand) throw new Error("Araç markası zorunludur.")
        if (!model) throw new Error("Araç modeli zorunludur.")
        if (!licensePlate) throw new Error("Araç plakası zorunludur.")
        const duplicateVehicle = this.resources.find((resource) =>
          resource.id !== id
          && resource.type === "VEHICLE"
          && resource.companyId === company.id
          && normalizeLicensePlate(resource.licensePlate) === licensePlate,
        )
        if (duplicateVehicle) throw new Error("Bu şirket için aynı plakaya sahip bir araç zaten kayıtlı.")
        return { ...common, type: "VEHICLE", brand, model, licensePlate }
      }
      case "DRIVER": {
        const fullName = input.fullName.trim()
        const licenseClasses = normalizeList(input.licenseClasses)
        const documents = normalizeList(input.documents)
        if (!fullName) throw new Error("Şoför adı soyadı zorunludur.")
        if (licenseClasses.length === 0) throw new Error("En az bir ehliyet sınıfı zorunludur.")
        if (typeof input.canDriveCommercialVehicles !== "boolean") {
          throw new Error("Ticari araç kullanım bilgisi zorunludur.")
        }
        return {
          ...common,
          type: "DRIVER",
          fullName,
          licenseClasses,
          documents,
          canDriveCommercialVehicles: input.canDriveCommercialVehicles,
        }
      }
    }
  }
}

function normalizeList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}

function normalizeLicensePlate(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase()
}

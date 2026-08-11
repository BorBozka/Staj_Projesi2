import type { FacilityResource, ResourceInput } from "@/domain/resources"
import { initialMockResources } from "@/services/mock-resource-data"
import { mockVisitReferenceData } from "@/services/mock-visit-data"
import type { ResourceCatalogService } from "@/services/resource-catalog-service"

const clone = <T,>(value: T): T => structuredClone(value)

export class MockResourceCatalogService implements ResourceCatalogService {
  private resources = clone(initialMockResources)

  async listResources(): Promise<FacilityResource[]> {
    return clone(this.resources).sort((a, b) =>
      a.companyName.localeCompare(b.companyName, "tr")
      || a.facilityName.localeCompare(b.facilityName, "tr")
      || a.name.localeCompare(b.name, "tr"),
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
    const company = mockVisitReferenceData.companies.find((item) => item.id === input.companyId)
    const facility = mockVisitReferenceData.facilities.find(
      (item) => item.id === input.facilityId && item.companyId === input.companyId,
    )
    const name = input.name.trim()

    if (input.type !== "ROOM" && input.type !== "POOLED_EQUIPMENT") {
      throw new Error("Geçersiz kaynak türü.")
    }
    if (!name) throw new Error("Kaynak adı zorunludur.")
    if (!company || !facility) throw new Error("Şirket ve tesis eşleşmesi geçersiz.")
    if (input.type === "POOLED_EQUIPMENT" && (!Number.isInteger(input.totalQuantity) || input.totalQuantity! <= 0)) {
      throw new Error("Ekipman havuzu miktarı pozitif bir tam sayı olmalıdır.")
    }

    return {
      id,
      type: input.type,
      name,
      companyId: company.id,
      companyName: company.name,
      facilityId: facility.id,
      facilityName: facility.name,
      totalQuantity: input.type === "POOLED_EQUIPMENT" ? input.totalQuantity : undefined,
      isActive,
      createdAt,
      updatedAt,
    }
  }
}

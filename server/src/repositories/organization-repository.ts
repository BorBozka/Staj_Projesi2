import type { EmployeeRecord, OrganizationEntity, OrganizationKind, SaveOrganizationInput } from "../modules/organization/types.js"

export interface OrganizationRepository {
  list(kind: OrganizationKind, includeInactive: boolean): Promise<OrganizationEntity[]>
  find(kind: OrganizationKind, id: string): Promise<OrganizationEntity | null>
  save(kind: OrganizationKind, input: SaveOrganizationInput & { nameNormalized: string }): Promise<OrganizationEntity>
  hasActiveChildren(kind: OrganizationKind, id: string): Promise<boolean>
  listEmployees(filters: { companyId?: string; facilityId?: string; includeInactive: boolean }): Promise<EmployeeRecord[]>
  findEmployee(id: string): Promise<EmployeeRecord | null>
}

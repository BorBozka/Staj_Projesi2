export interface OrganizationEntity {
  id: string
  parentId?: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface OrganizationSnapshot {
  companies: OrganizationEntity[]
  facilities: OrganizationEntity[]
  departments: OrganizationEntity[]
  securityGates: OrganizationEntity[]
}

export interface EmployeeRecord {
  id: string
  userId: string | null
  fullName: string
  companyId: string
  departmentId: string | null
  facilityIds: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export type OrganizationKind = "COMPANY" | "FACILITY" | "DEPARTMENT" | "SECURITY_GATE"

export interface SaveOrganizationInput {
  id?: string
  parentId?: string
  name: string
  active: boolean
}

export function normalizeOrganizationName(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR")
}

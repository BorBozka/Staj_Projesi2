import type { EmployeeRecord, OrganizationEntity, OrganizationKind, SaveOrganizationInput } from "../types.js"
import type { OrganizationRepository } from "../../../repositories/organization-repository.js"

const clone = <T>(value: T): T => structuredClone(value)
const keyByKind: Record<OrganizationKind, "companies" | "facilities" | "departments" | "securityGates"> = { COMPANY: "companies", FACILITY: "facilities", DEPARTMENT: "departments", SECURITY_GATE: "securityGates" }

export class InMemoryOrganizationRepository implements OrganizationRepository {
  private sequence = 0
  private readonly data: Record<"companies" | "facilities" | "departments" | "securityGates", OrganizationEntity[]>
  private readonly employees: EmployeeRecord[]

  constructor(initial: Partial<Record<"companies" | "facilities" | "departments" | "securityGates", OrganizationEntity[]>> = {}, employees: EmployeeRecord[] = []) {
    this.data = { companies: clone(initial.companies ?? []), facilities: clone(initial.facilities ?? []), departments: clone(initial.departments ?? []), securityGates: clone(initial.securityGates ?? []) }
    this.employees = clone(employees)
  }

  async list(kind: OrganizationKind, includeInactive: boolean) { return clone(this.data[keyByKind[kind]].filter((item) => includeInactive || item.active)) }
  async find(kind: OrganizationKind, id: string) { const item = this.data[keyByKind[kind]].find((candidate) => candidate.id === id); return item ? clone(item) : null }
  async save(kind: OrganizationKind, input: SaveOrganizationInput & { nameNormalized: string }) {
    const key = keyByKind[kind]
    const existing = input.id ? this.data[key].find((item) => item.id === input.id) : undefined
    const now = new Date("2026-01-01T00:00:00.000Z").toISOString()
    const entity: OrganizationEntity = { id: existing?.id ?? `${kind.toLowerCase()}-${++this.sequence}`, name: input.name, active: input.active, ...(input.parentId ? { parentId: input.parentId } : {}), createdAt: existing?.createdAt ?? now, updatedAt: now }
    this.data[key] = existing ? this.data[key].map((item) => item.id === entity.id ? entity : item) : [...this.data[key], entity]
    return clone(entity)
  }
  async hasActiveChildren(kind: OrganizationKind, id: string) {
    if (kind === "COMPANY") return [...this.data.facilities, ...this.data.departments].some((item) => item.parentId === id && item.active)
    return kind === "FACILITY" && this.data.securityGates.some((item) => item.parentId === id && item.active)
  }
  async listEmployees(filters: { companyId?: string; facilityId?: string; includeInactive: boolean }) { return clone(this.employees.filter((employee) => (filters.includeInactive || employee.active) && (!filters.companyId || employee.companyId === filters.companyId) && (!filters.facilityId || employee.facilityIds.includes(filters.facilityId)))) }
  async findEmployee(id: string) { const employee = this.employees.find((candidate) => candidate.id === id); return employee ? clone(employee) : null }
}

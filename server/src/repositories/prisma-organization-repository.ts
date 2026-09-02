import type { PrismaClient } from "@prisma/client"

import type { EmployeeRecord, OrganizationEntity, OrganizationKind, SaveOrganizationInput } from "../modules/organization/types.js"
import type { OrganizationRepository } from "./organization-repository.js"

function toEntity(row: { id: string; name: string; active: boolean; createdAt: Date; updatedAt: Date }, parentId?: string): OrganizationEntity {
  return { id: row.id, name: row.name, active: row.active, ...(parentId ? { parentId } : {}), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }
}

export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(kind: OrganizationKind, includeInactive: boolean): Promise<OrganizationEntity[]> {
    const activeWhere = includeInactive ? {} : { active: true }
    switch (kind) {
      case "COMPANY": return (await this.prisma.company.findMany({ where: activeWhere, orderBy: { name: "asc" } })).map((row) => toEntity(row))
      case "FACILITY": return (await this.prisma.facility.findMany({ where: activeWhere, orderBy: { name: "asc" } })).map((row) => toEntity(row, row.companyId))
      case "DEPARTMENT": return (await this.prisma.department.findMany({ where: activeWhere, orderBy: { name: "asc" } })).map((row) => toEntity(row, row.companyId))
      case "SECURITY_GATE": return (await this.prisma.securityGate.findMany({ where: activeWhere, orderBy: { name: "asc" } })).map((row) => toEntity(row, row.facilityId))
    }
  }

  async find(kind: OrganizationKind, id: string): Promise<OrganizationEntity | null> {
    switch (kind) {
      case "COMPANY": { const row = await this.prisma.company.findUnique({ where: { id } }); return row ? toEntity(row) : null }
      case "FACILITY": { const row = await this.prisma.facility.findUnique({ where: { id } }); return row ? toEntity(row, row.companyId) : null }
      case "DEPARTMENT": { const row = await this.prisma.department.findUnique({ where: { id } }); return row ? toEntity(row, row.companyId) : null }
      case "SECURITY_GATE": { const row = await this.prisma.securityGate.findUnique({ where: { id } }); return row ? toEntity(row, row.facilityId) : null }
    }
  }

  async save(kind: OrganizationKind, input: SaveOrganizationInput & { nameNormalized: string }): Promise<OrganizationEntity> {
    const data = { name: input.name, nameNormalized: input.nameNormalized, active: input.active }
    switch (kind) {
      case "COMPANY": { const row = input.id ? await this.prisma.company.update({ where: { id: input.id }, data }) : await this.prisma.company.create({ data }); return toEntity(row) }
      case "FACILITY": { const row = input.id ? await this.prisma.facility.update({ where: { id: input.id }, data }) : await this.prisma.facility.create({ data: { ...data, companyId: input.parentId! } }); return toEntity(row, row.companyId) }
      case "DEPARTMENT": { const row = input.id ? await this.prisma.department.update({ where: { id: input.id }, data }) : await this.prisma.department.create({ data: { ...data, companyId: input.parentId! } }); return toEntity(row, row.companyId) }
      case "SECURITY_GATE": { const row = input.id ? await this.prisma.securityGate.update({ where: { id: input.id }, data }) : await this.prisma.securityGate.create({ data: { ...data, facilityId: input.parentId! } }); return toEntity(row, row.facilityId) }
    }
  }

  async hasActiveChildren(kind: OrganizationKind, id: string): Promise<boolean> {
    if (kind === "COMPANY") return Boolean(await this.prisma.facility.count({ where: { companyId: id, active: true } }) || await this.prisma.department.count({ where: { companyId: id, active: true } }))
    if (kind === "FACILITY") return (await this.prisma.securityGate.count({ where: { facilityId: id, active: true } })) > 0
    return false
  }

  async listEmployees(filters: { companyId?: string; facilityId?: string; includeInactive: boolean }): Promise<EmployeeRecord[]> {
    const rows = await this.prisma.employee.findMany({
      where: { ...(filters.includeInactive ? {} : { active: true }), ...(filters.companyId ? { companyId: filters.companyId } : {}), ...(filters.facilityId ? { facilityScopes: { some: { facilityId: filters.facilityId } } } : {}) },
      include: { facilityScopes: { select: { facilityId: true } } }, orderBy: { fullName: "asc" },
    })
    return rows.map((row) => ({ id: row.id, userId: row.userId, fullName: row.fullName, companyId: row.companyId, departmentId: row.departmentId, facilityIds: row.facilityScopes.map((scope) => scope.facilityId), active: row.active, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }))
  }

  async findEmployee(id: string): Promise<EmployeeRecord | null> {
    const row = await this.prisma.employee.findUnique({ where: { id }, include: { facilityScopes: { select: { facilityId: true } } } })
    return row ? { id: row.id, userId: row.userId, fullName: row.fullName, companyId: row.companyId, departmentId: row.departmentId, facilityIds: row.facilityScopes.map((scope) => scope.facilityId), active: row.active, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } : null
  }
}

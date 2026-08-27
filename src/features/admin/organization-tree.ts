import type { OrganizationEntity, OrganizationKind, OrganizationSnapshot } from "@/domain/organization"

export type OrganizationGroupKind = "FACILITIES" | "DEPARTMENTS"

export interface OrganizationSelection {
  kind: OrganizationKind
  id: string
}

export interface VisibleOrganizationTreeItem {
  key: string
  parentKey: string | null
  depth: number
  nodeType: "ENTITY" | "GROUP"
  label: string
  expandable: boolean
  entity?: OrganizationEntity
  entityKind?: OrganizationKind
  groupKind?: OrganizationGroupKind
}

export const companyNodeKey = (companyId: string) => `company:${companyId}`
export const facilityNodeKey = (facilityId: string) => `facility:${facilityId}`
export const departmentNodeKey = (departmentId: string) => `department:${departmentId}`
export const securityGateNodeKey = (gateId: string) => `security-gate:${gateId}`
export const facilitiesGroupKey = (companyId: string) => `group:${companyId}:facilities`
export const departmentsGroupKey = (companyId: string) => `group:${companyId}:departments`

export function entityNodeKey(selection: OrganizationSelection) {
  if (selection.kind === "COMPANY") return companyNodeKey(selection.id)
  if (selection.kind === "FACILITY") return facilityNodeKey(selection.id)
  if (selection.kind === "DEPARTMENT") return departmentNodeKey(selection.id)
  return securityGateNodeKey(selection.id)
}

export function getDefaultOrganizationNavigation(organization: OrganizationSnapshot) {
  const company = organization.companies.find((item) => item.active) ?? organization.companies[0]
  if (!company) return { selection: null, expandedKeys: new Set<string>(), focusKey: "" }
  return {
    selection: { kind: "COMPANY", id: company.id } satisfies OrganizationSelection,
    expandedKeys: new Set([companyNodeKey(company.id), facilitiesGroupKey(company.id), departmentsGroupKey(company.id)]),
    focusKey: companyNodeKey(company.id),
  }
}

export function getVisibleOrganizationTreeItems(organization: OrganizationSnapshot, expandedKeys: ReadonlySet<string>) {
  const items: VisibleOrganizationTreeItem[] = []
  for (const company of organization.companies) {
    const companyKey = companyNodeKey(company.id)
    items.push({ key: companyKey, parentKey: null, depth: 1, nodeType: "ENTITY", label: company.name, expandable: true, entity: company, entityKind: "COMPANY" })
    if (!expandedKeys.has(companyKey)) continue

    const facilityGroupKey = facilitiesGroupKey(company.id)
    items.push({ key: facilityGroupKey, parentKey: companyKey, depth: 2, nodeType: "GROUP", label: "Tesisler", expandable: true, groupKind: "FACILITIES" })
    if (expandedKeys.has(facilityGroupKey)) {
      for (const facility of organization.facilities.filter((item) => item.parentId === company.id)) {
        const facilityKey = facilityNodeKey(facility.id)
        const gates = organization.securityGates.filter((item) => item.parentId === facility.id)
        items.push({ key: facilityKey, parentKey: facilityGroupKey, depth: 3, nodeType: "ENTITY", label: facility.name, expandable: gates.length > 0, entity: facility, entityKind: "FACILITY" })
        if (gates.length > 0 && expandedKeys.has(facilityKey)) {
          for (const gate of gates) items.push({ key: securityGateNodeKey(gate.id), parentKey: facilityKey, depth: 4, nodeType: "ENTITY", label: gate.name, expandable: false, entity: gate, entityKind: "SECURITY_GATE" })
        }
      }
    }

    const departmentGroupKey = departmentsGroupKey(company.id)
    items.push({ key: departmentGroupKey, parentKey: companyKey, depth: 2, nodeType: "GROUP", label: "Departmanlar", expandable: true, groupKind: "DEPARTMENTS" })
    if (expandedKeys.has(departmentGroupKey)) {
      for (const department of organization.departments.filter((item) => item.parentId === company.id)) items.push({ key: departmentNodeKey(department.id), parentKey: departmentGroupKey, depth: 3, nodeType: "ENTITY", label: department.name, expandable: false, entity: department, entityKind: "DEPARTMENT" })
    }
  }
  return items
}

export function getExpansionKeysForSelection(organization: OrganizationSnapshot, selection: OrganizationSelection) {
  const keys: string[] = []
  if (selection.kind === "COMPANY") return keys
  if (selection.kind === "FACILITY" || selection.kind === "DEPARTMENT") {
    const entity = selection.kind === "FACILITY" ? organization.facilities.find((item) => item.id === selection.id) : organization.departments.find((item) => item.id === selection.id)
    if (entity) keys.push(companyNodeKey(entity.parentId), selection.kind === "FACILITY" ? facilitiesGroupKey(entity.parentId) : departmentsGroupKey(entity.parentId))
    return keys
  }
  const gate = organization.securityGates.find((item) => item.id === selection.id)
  const facility = gate ? organization.facilities.find((item) => item.id === gate.parentId) : undefined
  if (facility) keys.push(companyNodeKey(facility.parentId), facilitiesGroupKey(facility.parentId), facilityNodeKey(facility.id))
  return keys
}

export function findSelectedOrganizationEntity(organization: OrganizationSnapshot, selection: OrganizationSelection | null) {
  if (!selection) return null
  const source = selection.kind === "COMPANY" ? organization.companies : selection.kind === "FACILITY" ? organization.facilities : selection.kind === "DEPARTMENT" ? organization.departments : organization.securityGates
  return source.find((item) => item.id === selection.id) ?? null
}

export type OrganizationTreeKeyboardAction = { type: "NONE" } | { type: "FOCUS"; key: string } | { type: "EXPAND"; key: string } | { type: "COLLAPSE"; key: string } | { type: "ACTIVATE" }

export function getOrganizationTreeKeyboardAction(key: string, currentKey: string, items: VisibleOrganizationTreeItem[], expandedKeys: ReadonlySet<string>): OrganizationTreeKeyboardAction {
  const index = items.findIndex((item) => item.key === currentKey)
  const current = items[index]
  if (!current) return { type: "NONE" }
  if (key === "ArrowDown" && index < items.length - 1) return { type: "FOCUS", key: items[index + 1].key }
  if (key === "ArrowUp" && index > 0) return { type: "FOCUS", key: items[index - 1].key }
  if (key === "ArrowRight") {
    if (current.expandable && !expandedKeys.has(current.key)) return { type: "EXPAND", key: current.key }
    const firstChild = items.find((item) => item.parentKey === current.key)
    return firstChild ? { type: "FOCUS", key: firstChild.key } : { type: "NONE" }
  }
  if (key === "ArrowLeft") {
    if (current.expandable && expandedKeys.has(current.key)) return { type: "COLLAPSE", key: current.key }
    return current.parentKey ? { type: "FOCUS", key: current.parentKey } : { type: "NONE" }
  }
  if (key === "Enter" || key === " ") return { type: "ACTIVATE" }
  return { type: "NONE" }
}

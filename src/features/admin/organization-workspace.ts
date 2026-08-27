import type { OrganizationEntity, OrganizationKind, OrganizationSnapshot } from "@/domain/organization"
import type { OrganizationSelection } from "@/features/admin/organization-tree"

export interface OrganizationDraft {
  name: string
  active: boolean
}

export type OrganizationWorkspaceMode =
  | { type: "view" }
  | { type: "edit"; selection: OrganizationSelection }
  | { type: "create"; kind: OrganizationKind; parentId?: string; returnSelection: OrganizationSelection | null }

export const viewOrganizationWorkspace = (): OrganizationWorkspaceMode => ({ type: "view" })

export function getOrganizationContextLabel(
  organization: OrganizationSnapshot,
  selection: OrganizationSelection,
) {
  const entity = findEntity(organization, selection)
  if (!entity) return "ORGANİZASYON"
  if (selection.kind === "COMPANY") return "ŞİRKET"

  if (selection.kind === "FACILITY" || selection.kind === "DEPARTMENT") {
    const company = organization.companies.find((item) => item.id === entity.parentId)
    return `${selection.kind === "FACILITY" ? "TESİS" : "DEPARTMAN"} · ${company?.name ?? "—"}`
  }

  const facility = organization.facilities.find((item) => item.id === entity.parentId)
  const company = organization.companies.find((item) => item.id === facility?.parentId)
  return `GÜVENLİK KAPISI · ${company?.name ?? "—"} / ${facility?.name ?? "—"}`
}

export function getInitialOrganizationDraft(mode: OrganizationWorkspaceMode, entity: OrganizationEntity | null): OrganizationDraft {
  return mode.type === "edit" && entity
    ? { name: entity.name, active: entity.active }
    : { name: "", active: true }
}

export function isOrganizationDraftDirty(draft: OrganizationDraft, initial: OrganizationDraft) {
  return draft.name !== initial.name || draft.active !== initial.active
}

export function getOrganizationNameError(name: string) {
  return name.trim() ? null : "Ad alanı boş bırakılamaz."
}

export function buildOrganizationSaveInput(
  mode: Exclude<OrganizationWorkspaceMode, { type: "view" }>,
  draft: OrganizationDraft,
  entity: OrganizationEntity | null,
): Omit<OrganizationEntity, "id"> & { id?: string } {
  if (mode.type === "edit") {
    if (!entity) throw new Error("Düzenlenecek organizasyon kaydı bulunamadı.")
    return {
      id: entity.id,
      name: draft.name,
      active: draft.active,
      ...(entity.parentId ? { parentId: entity.parentId } : {}),
    }
  }

  return {
    name: draft.name,
    active: draft.active,
    ...(mode.parentId ? { parentId: mode.parentId } : {}),
  }
}

function findEntity(organization: OrganizationSnapshot, selection: OrganizationSelection) {
  const source = selection.kind === "COMPANY"
    ? organization.companies
    : selection.kind === "FACILITY"
      ? organization.facilities
      : selection.kind === "DEPARTMENT"
        ? organization.departments
        : organization.securityGates
  return source.find((item) => item.id === selection.id)
}

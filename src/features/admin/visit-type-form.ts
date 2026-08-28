import type { VisitTypeDefinition } from "@/domain/admin"

export function getVisitTypeNameError(name: string): string | null {
  return name.trim() ? null : "Ziyaret türü adı boş bırakılamaz."
}

export function isVisitTypeDraftDirty(original: VisitTypeDefinition, draft: VisitTypeDefinition): boolean {
  return original.name !== draft.name || original.active !== draft.active
}

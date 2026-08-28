import type { VisitorCardInventoryItem } from "@/domain/admin"

export interface VisitorCardInventoryDraft {
  cardNumber: string
  active: boolean
}

export function getVisitorCardNumberError(cardNumber: string): string | null {
  return cardNumber.trim() ? null : "Kart numarası boş bırakılamaz."
}

export function isVisitorCardDraftDirty(original: VisitorCardInventoryItem, draft: VisitorCardInventoryDraft): boolean {
  return original.cardNumber !== draft.cardNumber || (original.status === "AVAILABLE") !== draft.active
}

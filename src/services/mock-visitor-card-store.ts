import type { VisitorCardInventoryItem } from "@/domain/admin"

const clone = <T,>(value: T): T => structuredClone(value)

export const defaultVisitorCards: VisitorCardInventoryItem[] = [
  { id: "card-1", cardNumber: "001", status: "AVAILABLE" },
  { id: "card-2", cardNumber: "002", status: "IN_USE", assignedVisitId: "v-today-late", assignedVisitorName: "Nergis Koral" },
  { id: "card-3", cardNumber: "003", status: "NOT_RETURNED", assignedVisitorName: "Can Uslu" },
  { id: "card-4", cardNumber: "004", status: "LOST" },
  { id: "card-5", cardNumber: "005", status: "DISABLED" },
  { id: "card-7", cardNumber: "007", status: "IN_USE", assignedVisitId: "v-today-overdue", assignedVisitorName: "Rüzgar Arman" },
  { id: "card-8", cardNumber: "008", status: "IN_USE", assignedVisitId: "v-lifecycle-active", assignedVisitorName: "Levent Yaman" },
  { id: "card-9", cardNumber: "009", status: "IN_USE", assignedVisitId: "v-security-inside-long", assignedVisitorName: "Zeynep Gülsevinç Karamehmetoğlu" },
  { id: "card-10", cardNumber: "010", status: "IN_USE", assignedVisitId: "v-security-inside-now", assignedVisitorName: "Barış Köseoğlu" },
  { id: "card-11", cardNumber: "011", status: "IN_USE", assignedVisitId: "v-security-inside-host-audit", assignedVisitorName: "Derya Akalın" },
  { id: "card-12", cardNumber: "012", status: "IN_USE", assignedVisitId: "v-security-inside-phone", assignedVisitorName: "Fırat Orhan" },
  { id: "card-13", cardNumber: "013", status: "IN_USE", assignedVisitId: "v-security-inside-5", assignedVisitorName: "İrem Yazgan" },
  { id: "card-14", cardNumber: "014", status: "IN_USE", assignedVisitId: "v-security-inside-6", assignedVisitorName: "Kaan Balcı" },
  { id: "card-15", cardNumber: "015", status: "IN_USE", assignedVisitId: "v-security-inside-7", assignedVisitorName: "Nalan Kurt" },
]

/**
 * Single source of truth for the physical visitor-card inventory's operational state.
 * MockAdminService (inventory and write-off) and MockSecurityService (assign, checkout, and
 * late return) share one instance of this store instead of maintaining separate
 * copies that could drift — Admin owns inventory identity, Security owns operational transitions,
 * but both read and write the same records.
 */
export class MockVisitorCardStore {
  private cards: VisitorCardInventoryItem[]

  constructor(initialCards: VisitorCardInventoryItem[] = defaultVisitorCards) {
    this.cards = clone(initialCards)
  }

  list(): VisitorCardInventoryItem[] {
    return clone(this.cards)
  }

  get(id: string): VisitorCardInventoryItem | undefined {
    const card = this.cards.find((item) => item.id === id)
    return card ? clone(card) : undefined
  }

  insert(card: VisitorCardInventoryItem): VisitorCardInventoryItem {
    this.cards = [...this.cards, card]
    return clone(card)
  }

  replace(id: string, next: VisitorCardInventoryItem): VisitorCardInventoryItem {
    this.cards = this.cards.map((card) => (card.id === id ? next : card))
    return clone(next)
  }
}

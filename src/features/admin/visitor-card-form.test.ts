import { describe, expect, it } from "vitest"

import type { VisitorCardInventoryItem } from "@/domain/admin"
import { getVisitorCardNumberError, isVisitorCardDraftDirty } from "@/features/admin/visitor-card-form"

const availableCard: VisitorCardInventoryItem = { id: "card-1", cardNumber: "001", status: "AVAILABLE" }

describe("Visitor card inventory form", () => {
  it("rejects empty and whitespace-only card numbers while allowing a valid create value", () => {
    expect(getVisitorCardNumberError("")).not.toBeNull()
    expect(getVisitorCardNumberError("   ")).not.toBeNull()
    expect(getVisitorCardNumberError("006")).toBeNull()
  })

  it("tracks card number and enabled-state changes while keeping an unchanged edit pristine", () => {
    expect(isVisitorCardDraftDirty(availableCard, { cardNumber: "001", active: true })).toBe(false)
    expect(isVisitorCardDraftDirty(availableCard, { cardNumber: "006", active: true })).toBe(true)
    expect(isVisitorCardDraftDirty(availableCard, { cardNumber: "001", active: false })).toBe(true)
  })
})

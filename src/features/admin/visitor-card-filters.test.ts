import { describe, expect, it } from "vitest"

import { clearVisitorCardFilterSearchParams, filterVisitorCards, parseVisitorCardFilters, updateVisitorCardFilterSearchParams } from "@/features/admin/visitor-card-filters"

const cards = [
  { id: "1", cardNumber: "0001", status: "AVAILABLE" as const },
  { id: "2", cardNumber: "A-002", status: "IN_USE" as const },
  { id: "3", cardNumber: "0003", status: "NOT_RETURNED" as const },
  { id: "4", cardNumber: "0040", status: "LOST" as const },
  { id: "5", cardNumber: "Z-005", status: "DISABLED" as const },
]

describe("visitor card filters", () => {
  it("searches card numbers partially, case-insensitively, and without surrounding whitespace", () => {
    expect(filterVisitorCards(cards, { search: " 00 ", status: "all" }).map((card) => card.id)).toEqual(["1", "2", "3", "4", "5"])
    expect(filterVisitorCards(cards, { search: " a-00 ", status: "all" }).map((card) => card.id)).toEqual(["2"])
  })

  it("filters each status and leaves all cards when status is all", () => {
    expect(filterVisitorCards(cards, { search: "", status: "all" })).toHaveLength(cards.length)
    for (const card of cards) expect(filterVisitorCards(cards, { search: "", status: card.status }).map((item) => item.id)).toEqual([card.id])
  })

  it("combines search and status filters", () => {
    expect(filterVisitorCards(cards, { search: "00", status: "NOT_RETURNED" }).map((card) => card.id)).toEqual(["3"])
  })

  it("falls back safely when the URL status is unknown", () => {
    expect(parseVisitorCardFilters(new URLSearchParams("tab=cards&cardQ=00&cardStatus=UNKNOWN"))).toEqual({ search: "00", status: "all" })
  })

  it("writes and clears only card filter parameters while preserving the tab", () => {
    const current = new URLSearchParams("tab=cards&source=nav")
    const filtered = updateVisitorCardFilterSearchParams(updateVisitorCardFilterSearchParams(current, "cardQ", "00"), "cardStatus", "NOT_RETURNED")
    expect(filtered.toString()).toBe("tab=cards&source=nav&cardQ=00&cardStatus=NOT_RETURNED")
    expect(clearVisitorCardFilterSearchParams(filtered).toString()).toBe("tab=cards&source=nav")
  })
})

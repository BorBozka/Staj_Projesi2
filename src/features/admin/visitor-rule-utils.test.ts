import { describe, expect, it } from "vitest"

import type { VisitorRuleVersion } from "@/domain/admin"
import { getActiveVisitorRule, getHistoricalVisitorRules, getVisitorRuleContentError, isVisitorRuleDraftDirty } from "@/features/admin/visitor-rule-utils"

const rules: VisitorRuleVersion[] = [
  { id: "rule-1", version: 1, content: "v1", createdAt: "2026-01-01", publishedAt: "2026-01-01", active: false },
  { id: "rule-3", version: 3, content: "v3", createdAt: "2026-03-01", publishedAt: "2026-03-01", active: true },
  { id: "rule-2", version: 2, content: "v2", createdAt: "2026-02-01", publishedAt: "2026-02-01", active: false },
]

describe("Visitor rule read model and draft validation", () => {
  it("finds the active version and returns history in descending version order independent of input order", () => {
    expect(getActiveVisitorRule([rules[0], rules[2], rules[1]])).toEqual(rules[1])
    expect(getHistoricalVisitorRules([rules[0], rules[2], rules[1]]).map((rule) => rule.version)).toEqual([2, 1])
  })

  it("handles empty and malformed no-active lists without crashing", () => {
    expect(getActiveVisitorRule([])).toBeNull()
    expect(getHistoricalVisitorRules([])).toEqual([])
    expect(getActiveVisitorRule(rules.filter((rule) => !rule.active))).toBeNull()
    expect(getHistoricalVisitorRules(rules.filter((rule) => !rule.active)).map((rule) => rule.version)).toEqual([2, 1])
  })

  it("validates the initial rule draft and tracks dirty content", () => {
    expect(getVisitorRuleContentError("")).not.toBeNull()
    expect(getVisitorRuleContentError("   ")).not.toBeNull()
    expect(getVisitorRuleContentError("Kural metni")).toBeNull()
    expect(isVisitorRuleDraftDirty("")).toBe(false)
    expect(isVisitorRuleDraftDirty("Kural metni")).toBe(true)
  })
})

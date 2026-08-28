import type { VisitorRuleVersion } from "@/domain/admin"

export function getActiveVisitorRule(rules: VisitorRuleVersion[]): VisitorRuleVersion | null {
  return rules.filter((rule) => rule.active).sort((left, right) => right.version - left.version)[0] ?? null
}

export function getHistoricalVisitorRules(rules: VisitorRuleVersion[]): VisitorRuleVersion[] {
  return rules.filter((rule) => !rule.active).sort((left, right) => right.version - left.version)
}

export function getVisitorRuleContentError(content: string): string | null {
  return content.trim() ? null : "Ziyaretçi kuralı boş bırakılamaz."
}

export function isVisitorRuleDraftDirty(content: string): boolean {
  return content.length > 0
}

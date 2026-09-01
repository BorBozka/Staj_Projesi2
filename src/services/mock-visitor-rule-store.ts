import type { VisitorRuleVersion } from "@/domain/admin"

const clone = <T,>(value: T): T => structuredClone(value)

export const initialMockVisitorRules: VisitorRuleVersion[] = [
  { id: "rule-2", version: 2, content: "Ziyaretçiler tesis güvenlik kurallarına ve yönlendirmelerine uymayı kabul eder.", publishedAt: "2026-08-01T09:30:00.000Z", active: true },
  { id: "rule-1", version: 1, content: "Ziyaretçiler tesis kurallarına uyacağını kabul eder.", publishedAt: "2026-02-01T09:20:00.000Z", active: false },
]

/** Shared rule/version state for Admin publishing and Security-desk acceptance. */
export class MockVisitorRuleStore {
  private rules: VisitorRuleVersion[]

  constructor(initialRules: VisitorRuleVersion[] = initialMockVisitorRules) {
    this.rules = clone(initialRules)
  }

  getAll() { return clone(this.rules) }

  getActive(): VisitorRuleVersion | null {
    return clone(this.rules.find((rule) => rule.active) ?? null)
  }

  publish(content: string): VisitorRuleVersion {
    const normalizedContent = content.trim()
    if (!normalizedContent) throw new Error("Ziyaretçi kuralı boş bırakılamaz.")
    const nextVersion = this.rules.reduce((maximum, item) => Math.max(maximum, item.version), 0) + 1
    const next: VisitorRuleVersion = { id: `rule-${crypto.randomUUID()}`, version: nextVersion, content: normalizedContent, publishedAt: new Date().toISOString(), active: true }
    this.rules = [next, ...this.rules.map((item) => ({ ...item, active: false }))]
    return clone(next)
  }
}

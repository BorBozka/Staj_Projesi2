import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const source = readFileSync(resolve(process.cwd(), "src/features/admin/SystemSettingsPage.tsx"), "utf8")

describe("System settings workspace patterns", () => {
  it("uses a selectable rules master/detail workspace rather than native disclosure rows", () => {
    expect(source).toContain("Kural versiyonları")
    expect(source).toContain("Ziyaretçi kuralı detayı")
    expect(source).toContain("overflow-y-auto p-4 scrollbar-thin")
    expect(source).not.toContain("<details")
    expect(source).not.toContain("<summary")
  })

  it("guards unsaved operational settings while preserving tab changes", () => {
    expect(source).toContain("beforeunload")
    expect(source).toContain('target.pathname !== window.location.pathname')
    expect(source).toContain('setSystemSettingsTab(searchParams, nextTab)')
  })

  it("keeps visitor usage detail beside status instead of a mostly empty column", () => {
    expect(source).toContain("Durum ve kullanım bilgisi")
    expect(source).toContain("item.assignedVisitorName &&")
    expect(source).not.toContain("Kullanım bilgisi</th>")
  })
})

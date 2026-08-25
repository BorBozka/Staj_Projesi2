import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const pageSource = readFileSync(resolve(process.cwd(), "src/features/reports/ReportsPage.tsx"), "utf8")

describe("custom comparison menu contract", () => {
  it("keeps an unfinished custom selection local while the dropdown remains open", () => {
    expect(pageSource).toContain('const [pendingCustom, setPendingCustom] = useState(false)')
    expect(pageSource).toContain('<DropdownMenu open={open} onOpenChange={handleOpenChange}>')
    expect(pageSource).toContain('if (next === "custom")')
    expect(pageSource).toContain('setPendingCustom(true)')
    expect(pageSource).toContain('onSelect={option.value === "custom" ? (event) => event.preventDefault() : undefined}')
  })

  it("commits only a valid custom date and resets a cancelled draft to the committed value", () => {
    expect(pageSource).toContain('if (!getComparisonPeriod(filters, "custom", nextStart)) return')
    expect(pageSource).toContain('onCustomStart(nextStart)')
    expect(pageSource).toContain('setDraftCustomStart(customStart)')
    expect(pageSource).toContain('setOpen(false)')
  })
})

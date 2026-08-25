import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const componentSource = readFileSync(resolve(process.cwd(), "src/features/transport/TransportPlanningPage.tsx"), "utf8")
const paginationFooterSource = readFileSync(resolve(process.cwd(), "src/components/common/PaginationFooter.tsx"), "utf8")

describe("TransportPlanningPage table polish", () => {
  it("uses the shared divider treatment and keeps totals in the footer", () => {
    expect(componentSource).toContain('className="divide-y"')
    expect(componentSource).toContain(">DURUM</th>")
    expect(componentSource).not.toContain("ŞİRKET / TESİS")
    expect(componentSource).not.toContain("{listTitle}")
    expect(componentSource).toContain("<PaginationFooter")
    expect(paginationFooterSource).toContain("min-h-[3.75rem] shrink-0")
    expect(paginationFooterSource).toContain("border-t bg-slate-50/50")
    expect(componentSource).toContain("Planlı atama sayfaları")
    expect(componentSource).toContain("setViewingAssignment(assignment)")
    expect(componentSource).toContain("useFillViewportHeight(14, [allVisibleAssignments.length])")
    expect(componentSource).toContain('recordsCardHeight === undefined && "min-h-[20rem]"')
    expect(componentSource).toContain('scroll-mt-3 flex h-full min-h-0 flex-col')
    expect(componentSource).not.toContain("h-[18.5rem] min-h-[18.5rem]")
    expect(componentSource).not.toContain("-mt-1 -mb-3 space-y-2 md:space-y-2.5")
  })
})

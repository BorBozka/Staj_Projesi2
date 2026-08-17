import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const componentSource = readFileSync(resolve(process.cwd(), "src/features/transport/TransportPlanningPage.tsx"), "utf8")

describe("TransportPlanningPage table polish", () => {
  it("uses the shared divider treatment and keeps totals in the footer", () => {
    expect(componentSource).toContain('className="divide-y"')
    expect(componentSource).toContain(">DURUM</th>")
    expect(componentSource).not.toContain("ŞİRKET / TESİS")
    expect(componentSource).not.toContain("{listTitle}")
    expect(componentSource).toContain("border-t bg-slate-50/50")
    expect(componentSource).toContain("Planlı atama sayfaları")
    expect(componentSource).toContain("setViewingAssignment(assignment)")
    expect(componentSource).toContain("h-[20rem] min-h-[20rem]")
    expect(componentSource).not.toContain("h-[18.5rem] min-h-[18.5rem]")
    expect(componentSource).toContain("-mt-1 -mb-3 space-y-2 md:space-y-2.5")
  })
})

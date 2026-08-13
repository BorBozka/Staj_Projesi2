import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const componentSource = readFileSync(
  resolve(process.cwd(), "src/features/resources/MeetingResourcePanel.tsx"),
  "utf8",
)

describe("MeetingResourcePanel empty states", () => {
  it("uses compact inline empty rows instead of dashed empty-state cards", () => {
    expect(componentSource).toContain("Oda atanmamış.")
    expect(componentSource).toContain("Ekipman atanmamış.")
    expect(componentSource).toContain("Oda Ata")
    expect(componentSource).toContain("Ekipman ekle")
    expect(componentSource).not.toContain("border-dashed bg-slate-50/40 p-3")
  })

  it("shares the closed-or-terminal read-only predicate and reports only persisted assignments", () => {
    expect(componentSource).toContain("isMeetingResourceReadOnly(meeting, visits)")
    expect(componentSource).toContain("(persistedDraft.room ? 1 : 0) + persistedDraft.equipment.length")
    expect(componentSource).toContain("}, [persistedDraft])")
  })
})

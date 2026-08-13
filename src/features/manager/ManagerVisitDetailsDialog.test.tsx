import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const componentSource = readFileSync(
  resolve(process.cwd(), "src/features/manager/ManagerVisitDetailsDialog.tsx"),
  "utf8",
)

describe("ManagerVisitDetailsDialog", () => {
  it("uses the compact centered dialog layout and omits lifecycle controls", () => {
    expect(componentSource).toContain('!max-h-[85vh] !w-[min(820px,calc(100vw-2rem))] !max-w-none')
    expect(componentSource).toContain("onOpenAutoFocus")
    expect(componentSource).toContain("content.getBoundingClientRect().top")
    expect(componentSource).toContain('lockedTop !== null && "!translate-y-0"')
    expect(componentSource).toContain("style={lockedTop === null ? undefined : { top: lockedTop }}")
    expect(componentSource).not.toContain('!h-[min(85vh,560px)]')
    expect(componentSource).toContain("overflow-y-auto")
    expect(componentSource).toContain("grid-cols-[minmax(0,45fr)_minmax(0,55fr)]")
    expect(componentSource).toContain("md:divide-x")
    expect(componentSource).toContain("Ziyaret Bilgileri")
    expect(componentSource).toContain("Kaynaklar")
    expect(componentSource).toContain("onAssignmentsCountChange")
    expect(componentSource).toContain("onDirtyChange")
    expect(componentSource).toContain('label="Davet"')
    expect(componentSource).toContain('label="İlgili personel"')
    expect(componentSource).not.toContain("!top-6")
    expect(componentSource).toContain('title="Not"')
    expect(componentSource).toContain("compact")
    expect(componentSource).not.toContain("MeetingLifecycleSection")
    expect(componentSource).not.toContain("Toplantıyı Bitir")
  })
})

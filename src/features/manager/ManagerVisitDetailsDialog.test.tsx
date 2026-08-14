import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const componentSource = readFileSync(
  resolve(process.cwd(), "src/features/manager/ManagerVisitDetailsDialog.tsx"),
  "utf8",
)

describe("ManagerVisitDetailsDialog", () => {
  it("uses the shared internal dialog position and omits lifecycle controls", () => {
    expect(componentSource).toContain("<InternalDialogContent")
    expect(componentSource).toContain('!max-h-[85vh] !w-[min(820px,calc(100vw-2rem))] !max-w-none')
    expect(componentSource).not.toContain("!h-")
    expect(componentSource).not.toContain("min-h-[")
    expect(componentSource).toContain("onOpenAutoFocus")
    expect(componentSource).toContain("event.preventDefault()")
    expect(componentSource).not.toContain("lockedTop")
    expect(componentSource).toContain('className="flex min-h-0 flex-1 flex-col overflow-clip"')
    expect(componentSource).toContain('"min-h-0 flex-1 overflow-y-auto px-5 py-4"')
    expect(componentSource).toContain('"min-h-0 flex-1 flex-col", activeTab === "resources" ? "flex" : "hidden"')
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
    expect(componentSource).toContain('className="mt-1 flex w-full justify-center gap-2"')
    expect(componentSource).not.toContain("MeetingLifecycleSection")
    expect(componentSource).not.toContain("Toplantıyı Bitir")
  })
})

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const componentSource = readFileSync(resolve(process.cwd(), "src/features/visits/VisitDetailsDialog.tsx"), "utf8")

describe("VisitDetailsDialog", () => {
  it("uses a compact two-column detail layout while preserving planned-visit actions", () => {
    expect(componentSource).toContain('!w-[min(640px,calc(100vw-2rem))] !max-w-none')
    expect(componentSource).toContain("min-[560px]:grid-cols-2")
    expect(componentSource).toContain("Ziyaretçi")
    expect(componentSource).toContain("Ziyaret")
    expect(componentSource).toContain('label="Davet" labelClassName="whitespace-nowrap"')
    expect(componentSource).toContain('title="Not"')
    expect(componentSource).toContain("border-t px-5 py-3")
    expect(componentSource).toContain("İptal Et")
    expect(componentSource).toContain("Ertele")
    expect(componentSource).toContain("Düzenle")
    expect(componentSource).toContain('label="Gerçek giriş"')
    expect(componentSource).toContain('label="Gerçek çıkış"')
    expect(componentSource).toContain('valueClassName="sm:whitespace-nowrap"')
    expect(componentSource).toContain("break-words text-xs font-normal leading-5 text-red-700")
    expect(componentSource).toContain('invitationSentAt: visit.invitationStatus === "SENT"')
    expect(componentSource).toContain('invitationError: visit.invitationStatus === "FAILED"')
    expect(componentSource).not.toContain("Ziyaret planı ve davet bilgileri")
    expect(componentSource).not.toContain("rounded-md border bg-slate-50/60")
  })
})

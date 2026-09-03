import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function readSource(file: string) {
  return readFileSync(resolve(process.cwd(), "src/features/visits", file), "utf8")
}

// Sentence case is what almost every dialog title in the app already uses, so the visit dialogs
// follow it rather than mixing in title case.
describe("visit dialog titles", () => {
  it("keeps every visit dialog title in sentence case", () => {
    expect(readSource("RescheduleVisitDialog.tsx")).toContain("<DialogTitle>Ziyareti ertele</DialogTitle>")
    expect(readSource("RescheduleVisitDialog.tsx")).not.toContain("Ziyareti Ertele")
    expect(readSource("VisitFormDialog.tsx")).toContain('{visit ? "Ziyareti düzenle" : "Yeni ziyaret"}')
    expect(readSource("CancelVisitDialog.tsx")).toContain('"İptal kapsamını seçin"')
  })
})

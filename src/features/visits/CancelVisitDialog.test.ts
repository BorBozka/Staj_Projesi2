import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = readFileSync(resolve(process.cwd(), "src/features/visits/CancelVisitDialog.tsx"), "utf8")

describe("CancelVisitDialog", () => {
  it("labels the confirm button without interpolating the visitor name", () => {
    expect(source).toContain('"Ziyareti İptal Et"')
    expect(source).not.toContain("${visitorName} Ziyaretini İptal Et")
  })

  it("keeps the reassuring info box on a neutral surface, not amber", () => {
    expect(source).not.toContain("amber")
  })

  it("uses the shared right-aligned footer instead of a full-width stacked one", () => {
    expect(source).not.toContain("sm:flex-col sm:items-stretch")
  })

  it("uses 'Ziyaret iptal edilsin mi?' title without the redundant 'Planlanan' prefix", () => {
    expect(source).toContain('"Ziyaret iptal edilsin mi?"')
    expect(source).not.toContain("Planlanan ziyaret iptal edilsin mi?")
  })
})

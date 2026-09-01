import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = readFileSync(resolve(process.cwd(), "src/features/security/SecurityGoodsMovementsPage.tsx"), "utf8")

describe("SecurityGoodsMovementsPage contract", () => {
  it("keeps the Security-only two-panel operation layout and its scoped search", () => {
    expect(source).toContain("Gelenler")
    expect(source).toContain("Gidenler")
    expect(source).toContain("Gecikenler")
    expect(source).toContain("Sıradakiler")
    expect(source).toContain("Firma, mal veya referans ara")
    expect(source).toContain("getSecurityScopedTodayPlannedGoodsMovements")
    expect(source).not.toContain("Şirket seç")
    expect(source).not.toContain("Tesis seç")
    expect(source).not.toContain("Pagination")
  })

  it("uses direction-specific completion and removes successful records from the operation list", () => {
    expect(source).toContain("Geldi")
    expect(source).toContain("Çıkış yaptı")
    expect(source).toContain("Geldi olarak kaydet")
    expect(source).toContain("Çıkışı tamamla")
    expect(source).toContain("goodsMovementService.completeGoodsMovement")
    expect(source).toContain("setMovements((current) => current.map")
    expect(source).toContain("actualPlate")
    expect(source).toContain("actualDriverName")
    expect(source).toContain("submitting")
    expect(source).toContain('role="alert"')
  })
})

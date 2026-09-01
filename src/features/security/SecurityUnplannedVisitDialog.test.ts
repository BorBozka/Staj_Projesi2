import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = readFileSync(resolve(process.cwd(), "src/features/security/SecurityUnplannedVisitDialog.tsx"), "utf8")

describe("SecurityUnplannedVisitDialog contract", () => {
  it("keeps the desk form compact and only exposes the approved fields", () => {
    expect(source).toContain("Ad")
    expect(source).toContain("Soyad")
    expect(source).toContain("Firma / Kurum")
    expect(source).toContain("Ev sahibi / ilgili personel")
    expect(source).toContain("Ziyaret türü")
    expect(source).not.toContain("Telefon")
    expect(source).toContain("Plaka")
    expect(source).not.toContain("E-posta")
    expect(source).not.toContain("Başlangıç")
    expect(source).not.toContain("Şirket seç")
    expect(source).not.toContain("Tesis seç")
    expect(source).toContain("Ziyaretçi bilgilerini girerek giriş kaydını oluşturun.")
    expect(source).not.toContain("Giriş zamanı şimdi alınır")
    expect(source).not.toContain("Varsayılanı değiştirmeniz gerekmez")
    expect(source).not.toContain("Kural sürümü")
  })

  it("uses active types, AVAILABLE cards, default duration, and required desk acceptance", () => {
    expect(source).toContain("visitTypes.filter((type) => type.active)")
    expect(source).toContain("securityService.getAvailableVisitorCards()")
    expect(source).toContain("DEFAULT_UNPLANNED_DURATION_MINUTES")
    expect(source).toContain("Ziyaretçi kuralları okudu ve kabul etti")
    expect(source).toContain("rulesAccepted")
    expect(source).toContain('aria-label="Özel süre"')
    expect(source).toContain("saat")
  })

  it("prevents duplicate submits and uses the one SecurityService desk action", () => {
    expect(source).toContain("submitting")
    expect(source).toContain("createAndCheckInUnplannedVisit")
    expect(source).toContain("Kaydet ve giriş yap")
    expect(source).toContain('role="alert"')
  })
})

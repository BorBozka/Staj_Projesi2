import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = readFileSync(resolve(process.cwd(), "src/features/security/SecurityCheckInDialog.tsx"), "utf8")

describe("SecurityCheckInDialog contract", () => {
  it("shows a read-only visit summary, not an editable planning form", () => {
    expect(source).toContain("Ziyaretçi</dt>")
    expect(source).toContain("Ev sahibi</dt>")
    expect(source).toContain("Tür</dt>")
    expect(source).toContain("Saat</dt>")
    expect(source).not.toContain('from "@/features/visits/VisitFormDialog"')
  })

  it("only offers AVAILABLE cards, sourced from SecurityService", () => {
    expect(source).toContain("securityService.getAvailableVisitorCards()")
    expect(source).toContain("card.cardNumber")
  })

  it("disables submit until a card is selected, and surfaces a no-card empty state", () => {
    expect(source).toContain("!selectedCardId")
    expect(source).toContain("noCardsAvailable")
    expect(source).toContain("Şu anda uygun ziyaretçi kartı yok.")
  })

  it("makes the plate optional and guards against a double submit", () => {
    expect(source).toContain("Plaka (opsiyonel)")
    expect(source).toContain("vehiclePlate: plate.trim() || undefined")
    expect(source).toContain("submitting")
    expect(source).toContain('"Giriş yapılıyor…"')
  })

  it("captures an optional phone at the gate and forwards it to check-in", () => {
    expect(source).toContain("Telefon (opsiyonel)")
    expect(source).toContain('type="tel"')
    expect(source).toContain('placeholder="05XX XXX XX XX"')
    expect(source).toContain("phone: phone.trim() ? normalizeVisitorPhone(phone) : undefined")
  })

  it("offers a subtle path to correct visitor details without leaving the check-in flow", () => {
    expect(source).toContain("Bilgileri düzelt")
    expect(source).toContain('from "@/features/security/SecurityVisitorCorrectionDialog"')
  })
})

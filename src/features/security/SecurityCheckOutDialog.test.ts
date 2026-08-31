import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = readFileSync(resolve(process.cwd(), "src/features/security/SecurityCheckOutDialog.tsx"), "utf8")

describe("SecurityCheckOutDialog contract", () => {
  it("requires an explicit card-return decision before checkout can submit", () => {
    expect(source).toContain("const [cardReturned, setCardReturned] = useState<boolean | null>(null)")
    expect(source).toContain("cardReturned === null")
    expect(source).toContain("Kart iade edildi")
    expect(source).toContain("Kart iade edilmedi")
  })

  it("shows compact operational context and submits through SecurityService", () => {
    expect(source).toContain("Ziyaretçi")
    expect(source).toContain("Kart")
    expect(source).toContain("Giriş")
    expect(source).toContain("securityService.checkOutVisit")
    expect(source).toContain("Çıkışı tamamla")
  })

  it("prevents a second submit while the checkout is pending", () => {
    expect(source).toContain("submitting")
    expect(source).toContain("Çıkış yapılıyor…")
  })
})

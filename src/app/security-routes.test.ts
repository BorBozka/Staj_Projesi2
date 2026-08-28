import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const appSource = readFileSync(resolve(process.cwd(), "src/app/App.tsx"), "utf8")

describe("Security routes", () => {
  it("redirects the Security index to operations inside its own shell", () => {
    expect(appSource).toContain('import { SecurityShell } from "@/components/app-shell/SecurityShell"')
    expect(appSource).toContain('<Route path="/security" element={<SecurityShell />}>')
    expect(appSource).toContain('<Route index element={<Navigate to="operations" replace />} />')
  })

  it("routes both Security modules without using the Manager shell", () => {
    expect(appSource).toContain('<Route path="operations"')
    expect(appSource).toContain('<SecurityOperationsPage />')
    expect(appSource).toContain('<Route path="goods-movements"')
    expect(appSource).toContain('<SecurityGoodsMovementsPage />')
  })

  it("defines the requested page titles", () => {
    expect(appSource).toContain('"/security/operations": "BPLAS — Güvenlik Operasyonu"')
    expect(appSource).toContain('"/security/goods-movements": "BPLAS — Güvenlik Mal Hareketleri"')
  })
})

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const pageSource = readFileSync(resolve(process.cwd(), "src/features/security/SecurityOperationsPage.tsx"), "utf8")

describe("SecurityOperationsPage contract", () => {
  it("uses URL-backed accessible workspace tabs", () => {
    expect(pageSource).toContain("useSearchParams")
    expect(pageSource).toContain('role="tablist"')
    expect(pageSource).toContain('role="tab"')
    expect(pageSource).toContain('role="tabpanel"')
    expect(pageSource).toContain("ArrowRight")
    expect(pageSource).toContain("ArrowLeft")
  })

  it("keeps the page fixed while table overflow stays inside the workspace", () => {
    expect(pageSource).toContain('className="flex h-full min-h-0 flex-col gap-3 overflow-hidden"')
    expect(pageSource).toContain('className="h-full min-h-0 overflow-auto scrollbar-thin"')
  })

  it("does not expose future mutation or card data", () => {
    expect(pageSource).toContain("+ Plansız ziyaret")
    expect(pageSource).toContain("disabled aria-describedby")
    expect(pageSource).toContain("Kart sorunu bulunan kayıt yok.")
    expect(pageSource).not.toContain("visitorCard")
    expect(pageSource).not.toContain("checkIn")
    expect(pageSource).not.toContain("checkOut")
    expect(pageSource).not.toContain('from "@/features/manager/')
  })
})

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

  it("uses a facility icon, not a clock, for the company/facility context box", () => {
    expect(pageSource).toContain("Building2")
    expect(pageSource).not.toContain("Clock3")
  })

  it("still gates unplanned-visit creation and card-issue data out of this phase", () => {
    expect(pageSource).toContain("+ Plansız ziyaret")
    expect(pageSource).toContain("disabled aria-describedby")
    expect(pageSource).toContain("Kart sorunu bulunan kayıt yok.")
    expect(pageSource).not.toContain("checkOut")
    expect(pageSource).not.toContain("NOT_RETURNED")
    expect(pageSource).not.toContain("LOST")
    expect(pageSource).not.toContain('from "@/features/manager/')
  })

  it("wires planned check-in and visitor correction through SecurityService, not Manager/Admin UI", () => {
    expect(pageSource).toContain('from "@/features/security/SecurityCheckInDialog"')
    expect(pageSource).toContain('from "@/features/security/SecurityVisitorCorrectionDialog"')
    expect(pageSource).toContain("Giriş yap")
    expect(pageSource).toContain("Düzenle")
    expect(pageSource).not.toContain('from "@/features/manager/')
    expect(pageSource).not.toContain("adminService")
  })
})

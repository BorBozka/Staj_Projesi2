import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = readFileSync(resolve(process.cwd(), "src/features/security/SecurityVisitorCorrectionDialog.tsx"), "utf8")

describe("SecurityVisitorCorrectionDialog contract", () => {
  it("labels email as optional and never warns on a blank value", () => {
    expect(source).toContain("E-posta (opsiyonel)")
    expect(source).not.toContain("required")
  })

  it("disables Save when nothing changed or the email is invalid", () => {
    expect(source).toContain("!dirty")
    expect(source).toContain("emailInvalid")
    expect(source).toContain("saveDisabled = invalid || !dirty || saving")
  })

  it("routes the mutation through SecurityService.correctVisitor, not Admin/Manager APIs", () => {
    expect(source).toContain("securityService.correctVisitor(")
    expect(source).not.toContain("adminService")
    expect(source).not.toContain('from "@/features/manager/')
  })
})

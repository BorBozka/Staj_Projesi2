import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = readFileSync(resolve(process.cwd(), "src/features/security/SecurityVisitorCorrectionDialog.tsx"), "utf8")

describe("SecurityVisitorCorrectionDialog contract", () => {
  it("does not move focus to or select the visitor name when the correction dialog opens", () => {
    expect(source).toContain("onOpenAutoFocus={(event) => event.preventDefault()}")
    expect(source).not.toContain("<Input autoFocus")
  })

  it("keeps the correction dialog header compact", () => {
    expect(source).not.toContain("Kapıda tespit edilen yazım hatalarını düzeltin.")
    expect(source).not.toContain("DialogDescription")
  })

  it("drops the e-mail field and edits the host name as free text instead", () => {
    expect(source).not.toContain("E-posta")
    expect(source).not.toContain("isValidVisitorEmail")
    expect(source).not.toContain("draft.email")
    expect(source).toContain('label="Ev sahibi"')
    expect(source).toContain("hostEmployeeName: visit.hostEmployeeName")
    // Free text, not a picker.
    expect(source).not.toContain("<Select")
    expect(source).not.toContain("required")
  })

  it("disables Save when nothing changed and requires name, company and host", () => {
    expect(source).toContain("!dirty")
    expect(source).toContain("!firstName || !lastName || !company || !hostEmployeeName")
    expect(source).toContain("draft.hostEmployeeName !== initial.hostEmployeeName")
    expect(source).toContain("saveDisabled = invalid || !dirty || saving")
  })

  it("sends the host name to correctVisitor and no longer sends an email field", () => {
    expect(source).toContain("hostEmployeeName,")
    expect(source).not.toContain("email:")
  })

  it("routes the mutation through SecurityService.correctVisitor, not Admin/Manager APIs", () => {
    expect(source).toContain("securityService.correctVisitor(")
    expect(source).not.toContain("adminService")
    expect(source).not.toContain('from "@/features/manager/')
  })
})

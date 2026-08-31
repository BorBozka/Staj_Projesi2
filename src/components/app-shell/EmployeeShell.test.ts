import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")
const shellSource = read("src/components/app-shell/EmployeeShell.tsx")
const focusedShellSource = read("src/components/app-shell/FocusedShell.tsx")
const appSource = read("src/app/App.tsx")

describe("EmployeeShell", () => {
  it("renders /my-visits through the sidebar-less shared shell", () => {
    expect(appSource).toContain('import { EmployeeShell } from "@/components/app-shell/EmployeeShell"')
    expect(appSource).toContain("<Route element={<EmployeeShell />}>")
    expect(appSource).not.toContain("AppShell")
    expect(shellSource).toContain("FocusedShell")
    expect(shellSource).toContain('roleLabel="Çalışan"')
  })

  it("has no sidebar, drawer or navigation for its single workspace", () => {
    expect(shellSource).not.toContain("Sidebar")
    expect(shellSource).not.toContain("MobileNavigation")
    expect(shellSource).not.toContain("navigation=")
    expect(shellSource).not.toContain("Ziyaretlerim")
  })
})

describe("FocusedShell", () => {
  it("is a presentational full-viewport shell with a compact header and centered nav slot", () => {
    expect(focusedShellSource).toContain("h-dvh")
    expect(focusedShellSource).toContain("<header")
    expect(focusedShellSource).toContain("<main")
    expect(focusedShellSource).toContain("grid-cols-[1fr_auto_1fr]")
    expect(focusedShellSource).toContain("FOCUSED_SHELL_HEADER_HEIGHT = 52")
    expect(focusedShellSource).not.toContain("<aside")
    expect(focusedShellSource).not.toContain("useState")
    expect(focusedShellSource).not.toContain("sessionStorage")
  })
})

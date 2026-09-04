import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")
const shellSource = read("src/components/app-shell/EmployeeShell.tsx")
const focusedShellSource = read("src/components/app-shell/FocusedShell.tsx")
const appSource = read("src/app/App.tsx")

describe("EmployeeShell", () => {
  it("renders the canonical employee route through the sidebar-less shared shell", () => {
    expect(appSource).toContain('import { EmployeeShell } from "@/components/app-shell/EmployeeShell"')
    expect(appSource).toContain("<Route element={<EmployeeShell />}>")
    expect(appSource).toContain('path="/employee/my-visits"')
    expect(appSource).not.toContain('path="/my-visits"')
    expect(appSource).not.toContain("AppShell")
    expect(shellSource).toContain("FocusedShell")
    expect(shellSource).toContain("useAuth")
    expect(shellSource).toContain("toAccountProfile(currentUser)")
    expect(shellSource).toContain('contentClassName="lg:pr-3"')
  })

  it("has no sidebar, drawer or navigation for its single workspace", () => {
    expect(shellSource).not.toContain("Sidebar")
    expect(shellSource).not.toContain("MobileNavigation")
    expect(shellSource).not.toContain("navigation=")
    expect(shellSource).toContain('title="Ziyaretlerim"')
    expect(shellSource).not.toContain("Ziyaret Yönetimi")
  })

  it("centers the shared HeaderClock in a header sized to match the Security header", () => {
    // Reuses the same component the Security operations header renders.
    expect(shellSource).toContain('import { HeaderClock } from "@/components/app-shell/HeaderClock"')
    expect(shellSource).toContain("headerCenter={<div className=\"hidden md:block\"><HeaderClock /></div>}")
    // No bespoke clock implementation.
    expect(shellSource).not.toContain("setInterval")
    expect(shellSource).not.toContain("toLocaleTimeString")
    // 64px header (like Security) so the 38px clock fits; page-height maths track it at 90px
    // in MyVisitsPage / HostedMeetingEndNotifications (covered by their own suites).
    expect(shellSource).toContain("headerHeight={64}")
  })
})

describe("FocusedShell", () => {
  it("is a presentational full-viewport shell with a compact, extensible header", () => {
    expect(focusedShellSource).toContain("h-dvh")
    expect(focusedShellSource).toContain("<header")
    expect(focusedShellSource).toContain("<main")
    expect(focusedShellSource).toContain("grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]")
    expect(focusedShellSource).toContain("headerNavigation?: ReactNode")
    expect(focusedShellSource).toContain("headerCenter?: ReactNode")
    expect(focusedShellSource).toContain("account: AccountProfile")
    expect(focusedShellSource).toContain("<AccountMenu profile={account} />")
    expect(focusedShellSource).toContain("FOCUSED_SHELL_HEADER_HEIGHT = 52")
    expect(focusedShellSource).not.toContain("<aside")
    expect(focusedShellSource).not.toContain("useState")
    expect(focusedShellSource).not.toContain("sessionStorage")
  })
})

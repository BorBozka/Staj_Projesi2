import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const pageSource = readFileSync(resolve(process.cwd(), "src/features/visits/MyVisitsPage.tsx"), "utf8")

describe("MyVisitsPage workspace density", () => {
  it("sizes the employee workspace to leave a 14px page gutter, without zoom", () => {
    expect(pageSource).toContain('const isEmployeeView = location.pathname.startsWith("/employee/")')
    // 52px header + 12px shell top padding + 14px page gutter.
    expect(pageSource).toContain('isEmployeeView ? "xl:h-[calc(100dvh-78px)]" : "xl:h-[calc(100dvh-76px)]"')
    expect(pageSource).toContain('isManagerView ? "xl:h-[calc(111.112dvh-27.5556px)]"')
    expect(pageSource).toContain('isEmployeeView ? "xl:grid-cols-[minmax(0,1fr)_280px] " : "xl:grid-cols-[minmax(0,1fr)_320px] "')
    expect(pageSource).not.toContain("zoom:0.9")
  })

  it("asks the timeline to fit its month and week grids only on the employee screen", () => {
    expect(pageSource).toContain("fitMonthToHeight={isEmployeeView}")
  })

  it("keeps the banners outside the scaled workspace", () => {
    const workspaceStart = pageSource.indexOf('<div className={"mb-[14px]')
    expect(pageSource.indexOf("{error && (")).toBeLessThan(workspaceStart)
    expect(pageSource.indexOf("{notice && (")).toBeLessThan(workspaceStart)
  })
})

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const pageSource = readFileSync(resolve(process.cwd(), "src/features/visits/MyVisitsPage.tsx"), "utf8")

describe("MyVisitsPage workspace density", () => {
  it("applies manager-equivalent density only to the employee workspace with width and height compensation", () => {
    expect(pageSource).toContain('const isEmployeeView = location.pathname.startsWith("/employee/")')
    expect(pageSource).toContain('isEmployeeView ? " xl:[zoom:0.9] xl:h-[calc((100dvh-76px)/0.9)]" : ""')
    expect(pageSource).toContain('isManagerView ? "xl:h-[calc(111.112dvh-27.5556px)]" : "xl:h-[calc(100dvh-76px)]"')
  })

  it("keeps the banners outside the scaled workspace", () => {
    const workspaceStart = pageSource.indexOf('<div className={"mb-[14px]')
    expect(pageSource.indexOf("{error && (")).toBeLessThan(workspaceStart)
    expect(pageSource.indexOf("{notice && (")).toBeLessThan(workspaceStart)
  })
})

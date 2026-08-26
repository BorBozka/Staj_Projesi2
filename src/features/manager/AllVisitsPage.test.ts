import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = readFileSync(resolve(process.cwd(), "src/features/manager/AllVisitsPage.tsx"), "utf8")

describe("All Visits table geometry", () => {
  it("fits the available workspace instead of forcing horizontal table scrolling", () => {
    expect(source).toContain('className="min-h-0 flex-1 overflow-hidden"')
    expect(source).toContain('className="h-full w-full table-fixed text-left text-xs"')
    expect(source).toContain('className="record-row-hover h-[50px]')
    expect(source).toContain('className={cn("h-[50px] pointer-events-none select-none"')
    expect(source).not.toContain("min-w-[1220px]")
    expect(source).not.toContain("overflow-x-auto overflow-y-hidden scrollbar-thin")
  })
})

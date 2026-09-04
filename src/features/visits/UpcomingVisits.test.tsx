import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { formatUpcomingVisitTypeLine } from "@/features/visits/upcoming-visits"

const componentSource = readFileSync(resolve(process.cwd(), "src/features/visits/UpcomingVisits.tsx"), "utf8")

describe("formatUpcomingVisitTypeLine", () => {
  it("joins visit type and visitor company with the middle-dot separator", () => {
    expect(formatUpcomingVisitTypeLine("Tedarikçi", "Nokta Finans Danışmanlık")).toBe("Tedarikçi · Nokta Finans Danışmanlık")
  })

  it("drops the separator when the company is blank or missing", () => {
    expect(formatUpcomingVisitTypeLine("Tedarikçi", "")).toBe("Tedarikçi")
    expect(formatUpcomingVisitTypeLine("Tedarikçi", "   ")).toBe("Tedarikçi")
    expect(formatUpcomingVisitTypeLine("Tedarikçi", undefined)).toBe("Tedarikçi")
  })
})

describe("UpcomingVisits layout", () => {
  it("moves the visit type off the name line into a second muted band with type and company", () => {
    expect(componentSource).toContain("const typeLine = formatUpcomingVisitTypeLine(visit.visitTypeName, visit.visitor.company)")
    expect(componentSource).toContain('<p className="mt-0.5 min-w-0 truncate text-xs text-slate-400" title={typeLine}>{typeLine}</p>')
    expect(componentSource).not.toContain('<p className="shrink-0 text-xs text-slate-400">{visit.visitTypeName}</p>')
  })

  it("keeps the schedule and different-facility bands with their icons on their own lines", () => {
    expect(componentSource).toContain("<Clock3 className=")
    expect(componentSource).toContain("<MapPin className=")
    expect(componentSource).toContain("Farklı tesis:")
  })

  it("keeps day headings above the scrolling visit rows", () => {
    expect(componentSource).toContain("relative isolate min-h-0 flex-1 overflow-y-auto")
    expect(componentSource).toContain('className="sticky top-0 z-20 bg-slate-100')
    expect(componentSource).not.toContain("overflow-y-auto pt-1.5")
  })

  it("keeps the title and search control in one bordered top block", () => {
    expect(componentSource).toContain('className="shrink-0 space-y-2 border-b px-3 py-2.5"')
    expect(componentSource).toContain('className="group block w-full border-b border-slate-200 px-3 py-2.5')
    expect(componentSource).not.toContain('className="shrink-0 flex items-center justify-between border-b px-3 py-2.5"')
  })
})

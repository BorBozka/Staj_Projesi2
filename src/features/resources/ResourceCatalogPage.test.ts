import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = readFileSync(resolve(process.cwd(), "src/features/resources/ResourceCatalogPage.tsx"), "utf8")

describe("Resource catalog table density", () => {
  it("renders resource details only in the Miktar / Detay column", () => {
    expect(source).toContain('<td className="px-3 py-1.5 sm:py-2 tabular-nums">{formatQuantity(resource)}</td>')
    expect(source).not.toContain("getResourceDetail")
    expect(source).not.toContain("text-[11px] text-slate-500\" title={detail}")
  })
})

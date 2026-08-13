import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const globalStyles = readFileSync(resolve(process.cwd(), "src/styles/globals.css"), "utf8")
const dialogSource = readFileSync(resolve(process.cwd(), "src/components/ui/dialog.tsx"), "utf8")

describe("global dialog scroll-lock", () => {
  it("uses Radix modal scroll-lock without a competing scrollbar-gutter reservation", () => {
    expect(dialogSource).toContain("@radix-ui/react-dialog")
    expect(globalStyles).not.toMatch(/scrollbar-gutter\s*:/)
    expect(globalStyles).toContain("Radix Dialog scroll-lock")
  })
})

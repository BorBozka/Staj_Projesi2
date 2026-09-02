import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")
const fields = {
  input: read("src/components/ui/input.tsx"),
  textarea: read("src/components/ui/textarea.tsx"),
  select: read("src/components/ui/select.tsx"),
}
const globals = read("src/styles/globals.css")

describe("form field focus ring", () => {
  it("keeps the heavier focus ring as the app-wide default for buttons and links", () => {
    expect(globals).toContain("outline-none ring-2 ring-ring ring-offset-2 ring-offset-background")
  })

  it("softens it on text fields, where the global ring plus offset plus border reads as a halo", () => {
    Object.entries(fields).forEach(([name, source]) => {
      expect(source, name).toContain("focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0")
      expect(source, name).toContain("focus-visible:border-ring")
      expect(source, name).not.toContain("focus-visible:ring-2")
    })
  })
})

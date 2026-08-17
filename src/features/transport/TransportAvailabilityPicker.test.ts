import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const componentSource = readFileSync(resolve(process.cwd(), "src/features/transport/TransportAvailabilityPicker.tsx"), "utf8")

describe("TransportAvailabilityPicker", () => {
  it("scrolls only the resource list when availability grows", () => {
    expect(componentSource).toContain("max-h-40")
    expect(componentSource).toContain("overflow-y-auto")
  })
})

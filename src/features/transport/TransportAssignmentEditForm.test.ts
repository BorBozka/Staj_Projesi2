import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const componentSource = readFileSync(resolve(process.cwd(), "src/features/transport/TransportAssignmentEditForm.tsx"), "utf8")

describe("TransportAssignmentEditForm", () => {
  it("keeps the dialog footprint compact so footer actions remain visible", () => {
    expect(componentSource).toContain('space-y-3 overflow-y-auto px-5 py-3')
    expect(componentSource).toContain('border-t bg-card px-5 py-2.5')
    expect(componentSource).toContain('space-y-0.5')
  })
})

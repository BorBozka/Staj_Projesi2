import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const componentSource = readFileSync(resolve(process.cwd(), "src/features/transport/TransportAssignmentDetailsDialog.tsx"), "utf8")

describe("TransportAssignmentDetailsDialog", () => {
  it("keeps the date visible in details without repeating it in the dialog header", () => {
    expect(componentSource).toContain('label="Tarih / saat"')
    expect(componentSource).not.toContain("<DialogDescription>")
  })
})

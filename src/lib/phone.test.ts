import { describe, expect, it } from "vitest"

import { formatLocalVisitorPhone, normalizeVisitorPhone } from "@/lib/phone"

describe("visitor phone helpers", () => {
  it("accepts local numbers with or without the leading zero and stores the canonical +90 format", () => {
    expect(normalizeVisitorPhone("0530 555 18 24")).toBe("+90 530 555 18 24")
    expect(normalizeVisitorPhone("530 555 18 24")).toBe("+90 530 555 18 24")
  })

  it("loads an existing +90 number in local input format", () => {
    expect(formatLocalVisitorPhone("+90 530 555 18 24")).toBe("0530 555 18 24")
  })
})

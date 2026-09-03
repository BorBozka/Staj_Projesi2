import { describe, expect, it } from "vitest"

import { getCustomExtensionError, getExtensionPreviewEnd, isValidCustomExtensionMinutes } from "@/features/visits/meeting-extension-utils"

describe("meeting extension preview", () => {
  const now = new Date("2026-09-03T08:31:00+03:00")

  it("calculates the new planned end from now for quick and custom durations", () => {
    expect(getExtensionPreviewEnd(now, 15)?.toISOString()).toBe("2026-09-03T05:46:00.000Z")
    expect(getExtensionPreviewEnd(now, 30)?.toISOString()).toBe("2026-09-03T06:01:00.000Z")
    expect(getExtensionPreviewEnd(now, 45)?.toISOString()).toBe("2026-09-03T06:16:00.000Z")
  })

  it("accepts inclusive five-minute bounds and distinguishes blank from invalid values", () => {
    expect(isValidCustomExtensionMinutes("5")).toBe(true)
    expect(isValidCustomExtensionMinutes("480")).toBe(true)
    expect(isValidCustomExtensionMinutes("0")).toBe(false)
    expect(isValidCustomExtensionMinutes("4")).toBe(false)
    expect(isValidCustomExtensionMinutes("7")).toBe(false)
    expect(isValidCustomExtensionMinutes("485")).toBe(false)
    expect(getCustomExtensionError("")).toBeNull()
    expect(getCustomExtensionError("4")).toBe("Uzatma süresi en az 5 dakika olmalıdır.")
    expect(getCustomExtensionError("7")).toBe("Uzatma süresi 5 dakikanın katı olmalıdır.")
    expect(getCustomExtensionError("481")).toBe("Uzatma süresi en fazla 480 dakika olabilir.")
    expect(getCustomExtensionError("x")).toBe("Geçerli bir dakika değeri girin.")
    expect(getExtensionPreviewEnd(now, 0)).toBeNull()
  })
})

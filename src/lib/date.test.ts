import { describe, expect, it } from "vitest"

import { getIstanbulWallClockTime } from "@/lib/date"

describe("getIstanbulWallClockTime", () => {
  it("normalizes UTC and offset ISO timestamps to the same Europe/Istanbul wall clock", () => {
    expect(getIstanbulWallClockTime("2026-08-24T08:30:00.000Z")).toEqual({ hour: 11, minute: 30 })
    expect(getIstanbulWallClockTime("2026-08-24T11:30:00+03:00")).toEqual({ hour: 11, minute: 30 })
  })
})

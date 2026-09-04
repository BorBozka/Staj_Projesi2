import { describe, expect, it } from "vitest"

import { formatIstanbulWallClockTime, formatMinutesDuration, getIstanbulWallClockMinutes, getIstanbulWallClockTime } from "@/lib/date"

describe("getIstanbulWallClockTime", () => {
  it("normalizes UTC and offset ISO timestamps to the same Europe/Istanbul wall clock", () => {
    expect(getIstanbulWallClockTime("2026-08-24T08:30:00.000Z")).toEqual({ hour: 11, minute: 30 })
    expect(getIstanbulWallClockTime("2026-08-24T11:30:00+03:00")).toEqual({ hour: 11, minute: 30 })
  })

  it("formats planned-visit instants as the same times shown by the month and detail views", () => {
    expect(formatIstanbulWallClockTime("2026-08-24T04:50:00.000Z")).toBe("07:50")
    expect(formatIstanbulWallClockTime("2026-08-24T07:20:00.000Z")).toBe("10:20")
    expect(formatIstanbulWallClockTime("2026-08-24T11:30:00.000Z")).toBe("14:30")
    expect(formatIstanbulWallClockTime("2026-08-24T13:00:00.000Z")).toBe("16:00")
    expect(getIstanbulWallClockMinutes("2026-08-24T04:50:00.000Z")).toBe(7 * 60 + 50)
  })
})

describe("formatMinutesDuration", () => {
  it("keeps sub-hour spans in minutes", () => {
    expect(formatMinutesDuration(0)).toBe("0 dk")
    expect(formatMinutesDuration(1)).toBe("1 dk")
    expect(formatMinutesDuration(59)).toBe("59 dk")
  })

  it("promotes to hours and keeps the minute remainder", () => {
    expect(formatMinutesDuration(60)).toBe("1 sa")
    expect(formatMinutesDuration(277)).toBe("4 sa 37 dk")
    expect(formatMinutesDuration(1439)).toBe("23 sa 59 dk")
  })

  it("drops a zero remainder instead of printing '0 dk'", () => {
    expect(formatMinutesDuration(120)).toBe("2 sa")
    expect(formatMinutesDuration(2880)).toBe("2 gün")
  })

  it("promotes to days and reports the leftover hours, not minutes", () => {
    expect(formatMinutesDuration(1440)).toBe("1 gün")
    expect(formatMinutesDuration(1500)).toBe("1 gün 1 sa")
    expect(formatMinutesDuration(4359)).toBe("3 gün")
  })

  it("clamps negative and fractional input", () => {
    expect(formatMinutesDuration(-5)).toBe("0 dk")
    expect(formatMinutesDuration(90.9)).toBe("1 sa 30 dk")
  })
})

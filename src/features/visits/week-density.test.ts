import { describe, expect, it } from "vitest"

import { resolveWeekDensity, weekDensitySteps, weekRowHeight } from "@/features/visits/week-density"

const quietWeek = [0, 0, 0, 0, 0, 0, 0]
const busyWeek = [0, 0, 6, 0, 0, 0, 0]

const totalHeight = (counts: number[], density: { pitch: number; labelFloor: number }) =>
  counts.reduce((total, count) => total + weekRowHeight(density, count), 0)

describe("resolveWeekDensity", () => {
  it("keeps the loosest step while the week comfortably fits", () => {
    expect(resolveWeekDensity(busyWeek, 600)).toEqual(weekDensitySteps[0])
  })

  it("falls back to the loosest step when the available height is not measured yet", () => {
    expect(resolveWeekDensity(busyWeek, 0)).toEqual(weekDensitySteps[0])
  })

  it("tightens just enough to fit a busy week into a short viewport", () => {
    const available = 400
    const density = resolveWeekDensity(busyWeek, available)
    expect(totalHeight(busyWeek, density)).toBeLessThanOrEqual(available)
    expect(density).not.toEqual(weekDensitySteps[0])
  })

  it("picks the loosest density that still fits rather than over-compressing", () => {
    const available = 400
    const chosen = resolveWeekDensity(busyWeek, available)
    const looser = weekDensitySteps.slice(0, weekDensitySteps.indexOf(chosen))
    looser.forEach((density) => expect(totalHeight(busyWeek, density)).toBeGreaterThan(available))
  })

  it("degrades to the tightest step instead of failing when nothing fits", () => {
    expect(resolveWeekDensity(busyWeek, 10)).toEqual(weekDensitySteps[weekDensitySteps.length - 1])
  })

  it("sizes a quiet week from the label floor alone", () => {
    const density = resolveWeekDensity(quietWeek, 400)
    expect(weekRowHeight(density, 0)).toBe(density.labelFloor)
  })

  it("never lets a stacked day overlap its blocks", () => {
    weekDensitySteps.forEach((density) => {
      const blockHeight = density.pitch - 3
      expect(blockHeight).toBeGreaterThan(0)
      expect(weekRowHeight(density, 3)).toBeGreaterThanOrEqual(2 + 2 * density.pitch + blockHeight)
    })
  })
})

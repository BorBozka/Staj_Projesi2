import { describe, expect, it } from "vitest"

import { layoutWeekLanes, resolveWeekDensity, weekDensitySteps, weekRowHeight } from "@/features/visits/week-density"

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

describe("layoutWeekLanes", () => {
  const visit = (id: string, startMinutes: number, endMinutes: number) => ({ id, startMinutes, endMinutes })
  const lanes = (items: ReturnType<typeof visit>[]) => layoutWeekLanes(items).placements.map(({ item, lane }) => [item.id, lane])

  it("puts a single visit in lane zero", () => {
    expect(lanes([visit("a", 9 * 60, 10 * 60)])).toEqual([["a", 0]])
  })

  it("reuses lane zero for three non-overlapping visits", () => {
    const layout = layoutWeekLanes([visit("a", 9 * 60, 10 * 60), visit("b", 11 * 60, 12 * 60), visit("c", 13 * 60, 14 * 60)])
    expect(layout.placements.map(({ lane }) => lane)).toEqual([0, 0, 0])
    expect(layout.laneCount).toBe(1)
  })

  it("allows visits that touch end-to-start to share a lane", () => {
    expect(lanes([visit("a", 10 * 60, 11 * 60), visit("b", 11 * 60, 12 * 60)])).toEqual([["a", 0], ["b", 0]])
  })

  it("separates fully overlapping visits", () => {
    expect(lanes([visit("a", 10 * 60, 12 * 60), visit("b", 10 * 60, 12 * 60)])).toEqual([["a", 0], ["b", 1]])
  })

  it("reuses the earliest available lane in a partial-overlap chain", () => {
    expect(lanes([visit("a", 9 * 60, 11 * 60), visit("b", 10 * 60, 12 * 60), visit("c", 11 * 60 + 30, 13 * 60)])).toEqual([["a", 0], ["b", 1], ["c", 0]])
  })

  it("produces the same placements regardless of input order", () => {
    const items = [visit("a", 9 * 60, 11 * 60), visit("b", 10 * 60, 12 * 60), visit("c", 11 * 60 + 30, 13 * 60)]
    expect(lanes([...items].reverse())).toEqual(lanes(items))
  })

  it("uses the id to deterministically order identical time ranges", () => {
    expect(lanes([visit("b", 10 * 60, 11 * 60), visit("a", 10 * 60, 11 * 60)])).toEqual([["a", 0], ["b", 1]])
  })
})

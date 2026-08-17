import { describe, expect, it } from "vitest"

import {
  getOperationNowIndicator,
  millisecondsUntilNextMinute,
  startMinuteClock,
  type MinuteClockEnvironment,
} from "./manager-clock"

function createClockEnvironment(initialTime: string) {
  let currentTime = new Date(initialTime)
  let visible = true
  let nextTimerId = 1
  const timers = new Map<number, { callback: () => void; delay: number }>()
  const visibilityListeners = new Set<() => void>()

  const environment: MinuteClockEnvironment = {
    now: () => new Date(currentTime),
    setTimeout: (callback, delay) => {
      const timerId = nextTimerId++
      timers.set(timerId, { callback, delay })
      return timerId
    },
    clearTimeout: (timerId) => { timers.delete(timerId) },
    addVisibilityListener: (listener) => { visibilityListeners.add(listener) },
    removeVisibilityListener: (listener) => { visibilityListeners.delete(listener) },
    isVisible: () => visible,
  }

  return {
    environment,
    timers,
    visibilityListeners,
    setTime(value: string) { currentTime = new Date(value) },
    setVisible(value: boolean) { visible = value },
    fireNextTimer() {
      const [timerId, timer] = [...timers.entries()][0]
      timers.delete(timerId)
      timer.callback()
    },
    fireVisibilityChange() { visibilityListeners.forEach((listener) => listener()) },
  }
}

describe("manager minute clock", () => {
  it("aligns its timer to the next minute boundary", () => {
    expect(millisecondsUntilNextMinute(new Date("2026-08-10T15:04:42.250+03:00"))).toBe(17_750)
    expect(millisecondsUntilNextMinute(new Date("2026-08-10T15:05:00.000+03:00"))).toBe(60_000)
  })

  it("uses one time value for the label and line, then updates both on the next minute", () => {
    const clock = createClockEnvironment("2026-08-10T12:04:42.250Z")
    const indicators: ReturnType<typeof getOperationNowIndicator>[] = []
    const stop = startMinuteClock((now) => indicators.push(getOperationNowIndicator(now, 8, 23)), clock.environment)

    expect(indicators[0]).toMatchObject({ label: "Şimdi 12.04", leftPercent: ((12 + 4 / 60 - 8) / 15) * 100 })
    expect([...clock.timers.values()][0].delay).toBe(17_750)

    clock.setTime("2026-08-10T12:05:00.000Z")
    clock.fireNextTimer()

    expect(indicators[1]).toMatchObject({ label: "Şimdi 12.05", leftPercent: ((12 + 5 / 60 - 8) / 15) * 100 })
    expect(indicators[1]!.leftPercent).toBeGreaterThan(indicators[0]!.leftPercent)
    stop()
  })

  it("cleans up its timer and visibility listener", () => {
    const clock = createClockEnvironment("2026-08-10T15:04:42.250+03:00")
    const stop = startMinuteClock(() => undefined, clock.environment)

    expect(clock.timers.size).toBe(1)
    expect(clock.visibilityListeners.size).toBe(1)
    stop()
    expect(clock.timers.size).toBe(0)
    expect(clock.visibilityListeners.size).toBe(0)
  })

  it("resynchronizes immediately when the page becomes visible again", () => {
    const clock = createClockEnvironment("2026-08-10T15:04:42.250+03:00")
    const updates: Date[] = []
    const stop = startMinuteClock((now) => updates.push(now), clock.environment)

    clock.setVisible(false)
    clock.setTime("2026-08-10T15:09:10.000+03:00")
    clock.fireVisibilityChange()
    expect(updates).toHaveLength(1)

    clock.setVisible(true)
    clock.fireVisibilityChange()
    expect(updates.at(-1)?.getMinutes()).toBe(9)
    expect([...clock.timers.values()][0].delay).toBe(50_000)
    stop()
  })

  it("keeps the existing graph-range visibility rule", () => {
    expect(getOperationNowIndicator(new Date("2026-08-10T04:59:00Z"), 5, 20)).toBeNull()
    expect(getOperationNowIndicator(new Date("2026-08-10T20:00:00Z"), 5, 20)).not.toBeNull()
    expect(getOperationNowIndicator(new Date("2026-08-10T20:01:00Z"), 5, 20)).toBeNull()
  })
})

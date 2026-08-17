import { getIsoWallClockTime } from "@/lib/date"

export interface MinuteClockEnvironment {
  now(): Date
  setTimeout(callback: () => void, delay: number): number
  clearTimeout(timerId: number): void
  addVisibilityListener(listener: () => void): void
  removeVisibilityListener(listener: () => void): void
  isVisible(): boolean
}

export function millisecondsUntilNextMinute(now: Date) {
  const elapsedMilliseconds = now.getSeconds() * 1_000 + now.getMilliseconds()
  return elapsedMilliseconds === 0 ? 60_000 : 60_000 - elapsedMilliseconds
}

export function startMinuteClock(
  onTimeChange: (now: Date) => void,
  environment: MinuteClockEnvironment = browserMinuteClockEnvironment,
) {
  let timerId: number | null = null
  let stopped = false

  function clearTimer() {
    if (timerId === null) return
    environment.clearTimeout(timerId)
    timerId = null
  }

  function scheduleFrom(now: Date) {
    clearTimer()
    timerId = environment.setTimeout(tick, millisecondsUntilNextMinute(now))
  }

  function sync() {
    if (stopped || !environment.isVisible()) return
    const now = environment.now()
    onTimeChange(now)
    scheduleFrom(now)
  }

  function tick() {
    timerId = null
    sync()
  }

  environment.addVisibilityListener(sync)
  sync()

  return () => {
    stopped = true
    clearTimer()
    environment.removeVisibilityListener(sync)
  }
}

export function getOperationNowIndicator(now: Date, startHour: number, endHour: number) {
  const time = getIsoWallClockTime(now);
  if (!time) return null;

  const currentHour = time.hour + time.minute / 60;
  if (currentHour < startHour || currentHour > endHour) return null;

  const hStr = String(time.hour).padStart(2, "0");
  const mStr = String(time.minute).padStart(2, "0");

  return {
    label: `Şimdi ${hStr}.${mStr}`,
    labelAlignment: currentHour < startHour + 1.5
      ? "translate-x-1"
      : currentHour > endHour - 1.5
        ? "-translate-x-[calc(100%+4px)]"
        : "-translate-x-1/2",
    leftPercent: ((currentHour - startHour) / (endHour - startHour)) * 100,
  }
}

const browserMinuteClockEnvironment: MinuteClockEnvironment = {
  now: () => new Date(),
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
  clearTimeout: (timerId) => window.clearTimeout(timerId),
  addVisibilityListener: (listener) => document.addEventListener("visibilitychange", listener),
  removeVisibilityListener: (listener) => document.removeEventListener("visibilitychange", listener),
  isVisible: () => document.visibilityState === "visible",
}

import { useEffect, useState } from "react"

/**
 * Second-updating clock with a date line, centered in a FocusedShell header.
 * Shared verbatim by the Security operations header and the Employee header.
 */
export function HeaderClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1_000)
    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <div className="shrink-0 text-center leading-none">
      <time className="block tabular-nums text-[38px] font-semibold tracking-tight text-slate-900" dateTime={now.toISOString()}>{formatClockTime(now)}</time>
      <p className="mt-0.5 text-[11px] text-slate-500">{formatClockDate(now)}</p>
    </div>
  )
}

function formatClockTime(value: Date) {
  return value.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
}

function formatClockDate(value: Date) {
  return value.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" })
}

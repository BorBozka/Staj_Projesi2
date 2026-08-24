import { addDays } from "date-fns"

const ISTANBUL_TIME_ZONE = "Europe/Istanbul"
const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: ISTANBUL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" })

export const mockScenarioNow = new Date()

function istanbulDateParts(value: Date) {
  const parts = dateFormatter.formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ""
  return { year: Number(part("year")), month: Number(part("month")), day: Number(part("day")) }
}

function formatIstanbulDate(value: Date) {
  const { year, month, day } = istanbulDateParts(value)
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function scenarioDate(dayOffset = 0) {
  const { year, month, day } = istanbulDateParts(mockScenarioNow)
  return formatIstanbulDate(addDays(new Date(Date.UTC(year, month - 1, day, 12)), dayOffset))
}

export function scenarioAt(dayOffset: number, hour: number, minute = 0) {
  const localTime = `${scenarioDate(dayOffset)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+03:00`
  return new Date(localTime).toISOString()
}

export function scenarioMoment(minutesFromNow = 0) {
  const value = new Date(mockScenarioNow.getTime() + minutesFromNow * 60_000)
  return value.toISOString()
}

export function scenarioCreatedAt(dayOffset = -7) {
  return scenarioAt(dayOffset, 9, 15)
}

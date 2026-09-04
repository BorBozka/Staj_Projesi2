import { differenceInMinutes, isSameDay } from "date-fns"

import type { Visit } from "@/domain/visits"
import { formatMinutesDuration, formatTr } from "@/lib/date"

export function formatVisitActualTimes(visit: Pick<Visit, "plannedStart" | "actualCheckIn" | "actualCheckOut">) {
  const plannedStart = new Date(visit.plannedStart)
  const checkIn = visit.actualCheckIn ? new Date(visit.actualCheckIn) : undefined
  const checkOut = visit.actualCheckOut ? new Date(visit.actualCheckOut) : undefined

  // Match the dialog's existing Date-based local display, including local day boundaries.
  const formatActualTime = (date: Date) => formatTr(date, isSameDay(date, plannedStart) ? "HH:mm" : "d MMMM yyyy · HH:mm")
  const durationMinutes = checkIn && checkOut ? differenceInMinutes(checkOut, checkIn) : 0

  return {
    checkIn: checkIn ? formatActualTime(checkIn) : undefined,
    checkOut: checkOut ? `${formatActualTime(checkOut)}${durationMinutes > 0 ? ` · ${formatMinutesDuration(durationMinutes)}` : ""}` : undefined,
  }
}

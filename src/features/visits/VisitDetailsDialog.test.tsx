import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { formatVisitActualTimes } from "@/features/visits/visit-details-format"
import { formatMinutesDuration } from "@/lib/date"

const componentSource = readFileSync(resolve(process.cwd(), "src/features/visits/VisitDetailsDialog.tsx"), "utf8")

describe("VisitDetailsDialog", () => {
  it("uses a compact two-column detail layout while preserving planned-visit actions", () => {
    expect(componentSource).toContain('!w-[min(640px,calc(100vw-2rem))] !max-w-none')
    expect(componentSource).toContain("min-[560px]:grid-cols-2")
    expect(componentSource).toContain("Ziyaretçi")
    expect(componentSource).toContain("Ziyaret")
    expect(componentSource).toContain('label="Davet" labelClassName="whitespace-nowrap" truncateValue={false}')
    expect(componentSource).toContain('title="Not"')
    expect(componentSource).toContain("border-t px-5 py-3")
    expect(componentSource).toContain("İptal Et")
    expect(componentSource).toContain("Ertele")
    expect(componentSource).toContain("Düzenle")
    expect(componentSource).toContain('label="Gerçek giriş"')
    expect(componentSource).toContain('label="Gerçek çıkış"')
    expect(componentSource).toContain('"d MMMM yyyy"')
    expect(componentSource).toContain("Başlangıç")
    expect(componentSource).toContain("Çıkış")
    expect(componentSource).not.toContain("title={headerSummary}")
    expect(componentSource).toContain('label="Planlanan"')
    expect(componentSource).toContain('label="Ziyaret Türü" value={visit.visitTypeName}')
    expect(componentSource).toContain('const plannedDateLine = formatTr(new Date(visit.plannedStart), "d MMMM yyyy")')
    expect(componentSource).toContain("const plannedTimeLine = `Başlangıç ")
    expect(componentSource).toContain('grid-cols-[112px_minmax(0,1fr)]')
    expect(componentSource).toContain('label="E-posta" truncateValue={false} value={visit.visitor.email')
    expect(componentSource).toContain('<VisitorEmail email={visit.visitor.email} />')
    expect(componentSource).toContain('cn("min-w-0 font-medium text-slate-900", truncateValue && "truncate", valueClassName)')
    expect(componentSource).toContain('const valueTitle = typeof value === "string" ? value : undefined')
    expect(componentSource).toContain('title={valueTitle}')
    expect(componentSource).toContain("break-words text-xs font-normal leading-5 text-red-700")
    expect(componentSource).toContain('invitationSentAt: visit.invitationStatus === "SENT"')
    expect(componentSource).toContain('invitationError: visit.invitationStatus === "FAILED"')
    expect(componentSource).not.toContain("Ziyaret planı ve davet bilgileri")
    expect(componentSource).not.toContain("rounded-md border bg-slate-50/60")
  })
})

describe("VisitDetailsDialog invitation", () => {
  it("keeps the status badge but drops the separate send-time line", () => {
    expect(componentSource).toContain("invitationSurfaces[visit.invitationStatus]")
    expect(componentSource).toContain("formatInvitationSentAt(visit.invitationSentAt)")
    expect(componentSource).not.toContain("Gönderim: ")
  })
})

// Serialize local times just as the visit form does; expectations follow the runtime's local day.
const localTime = (day: number, hour: number, minute: number) => new Date(2026, 8, day, hour, minute).toISOString()
const plannedStart = localTime(2, 9, 0)

describe("VisitDetailsDialog actual times", () => {
  it("shows only the time for arrival on the planned day, without a duration", () => {
    expect(formatVisitActualTimes({ plannedStart, actualCheckIn: localTime(2, 9, 12) })).toEqual({
      checkIn: "09:12", checkOut: undefined,
    })
  })

  it("keeps the next day's date with a long month and omits duration without arrival", () => {
    const result = formatVisitActualTimes({ plannedStart, actualCheckOut: localTime(3, 1, 15) })
    expect(result).toEqual({ checkIn: undefined, checkOut: "3 Eylül 2026 · 01:15" })
    expect(result.checkOut).not.toContain("Eyl 2026")
  })

  it("appends the existing duration formatter's output to the departure time", () => {
    expect(formatVisitActualTimes({ plannedStart, actualCheckIn: localTime(2, 9, 12), actualCheckOut: localTime(2, 10, 27) })).toEqual({
      checkIn: "09:12", checkOut: `10:27 · ${formatMinutesDuration(75)}`,
    })
  })

  it.each([12, 11])("omits a zero or negative duration while preserving departure (%i minutes)", (minute) => {
    expect(formatVisitActualTimes({ plannedStart, actualCheckIn: localTime(2, 9, 12), actualCheckOut: localTime(2, 9, minute) }).checkOut)
      .toBe(`09:${minute}`)
  })

  it("uses local day boundaries for both arrival and departure across midnight", () => {
    expect(formatVisitActualTimes({ plannedStart: localTime(2, 23, 0), actualCheckIn: localTime(2, 23, 45), actualCheckOut: localTime(3, 0, 15) })).toEqual({
      checkIn: "23:45", checkOut: "3 Eylül 2026 · 00:15 · 30 dk",
    })
  })

  it("omits the date across UTC midnight when both times fall on the same local day", () => {
    expect(formatVisitActualTimes({ plannedStart: localTime(2, 0, 15), actualCheckIn: localTime(2, 9, 12) }).checkIn).toBe("09:12")
  })

  it("retains a different arrival date with a long month", () => {
    expect(formatVisitActualTimes({ plannedStart, actualCheckIn: localTime(1, 23, 45) }).checkIn).toBe("1 Eylül 2026 · 23:45")
  })

  it("keeps both actual fields absent before arrival", () => {
    expect(formatVisitActualTimes({ plannedStart })).toEqual({ checkIn: undefined, checkOut: undefined })
  })

  it("uses the formatted values in the existing conditional rows and keeps facility visible", () => {
    expect(componentSource).toContain('{visit.actualCheckIn && <Field label="Gerçek giriş" value={actualTimes.checkIn} />}')
    expect(componentSource).toContain('{visit.actualCheckOut && <Field label="Gerçek çıkış" value={actualTimes.checkOut} />}')
    expect(componentSource).toContain('<Field label="Tesis" value={visit.facilityName} />')
    expect(componentSource).not.toContain('label="Süre"')
    expect(componentSource).not.toContain('"d MMM yyyy · HH:mm"')
  })
})

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const componentSource = readFileSync(resolve(process.cwd(), "src/features/visits/VisitDetailsDialog.tsx"), "utf8")

describe("VisitDetailsDialog", () => {
  it("uses a compact two-column detail layout while preserving planned-visit actions", () => {
    expect(componentSource).toContain('!w-[min(640px,calc(100vw-2rem))] !max-w-none')
    expect(componentSource).toContain("min-[560px]:grid-cols-2")
    expect(componentSource).toContain("Ziyaretçi")
    expect(componentSource).toContain("Ziyaret")
    expect(componentSource).toContain('label="Davet" labelClassName="whitespace-nowrap"')
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

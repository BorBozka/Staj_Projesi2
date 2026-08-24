import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const tabSource = readFileSync(resolve(process.cwd(), "src/features/reports/FleetReportTab.tsx"), "utf8")
const dialogSource = readFileSync(resolve(process.cwd(), "src/features/reports/FleetAssignmentDetailDialog.tsx"), "utf8")
const chartSource = readFileSync(resolve(process.cwd(), "src/features/reports/FleetLoadChart.tsx"), "utf8")

describe("Fleet report records UI contract", () => {
  it("keeps purpose single-line in the table without company/facility secondary text", () => {
    expect(tabSource).toContain('<p className="truncate" title={assignment.purpose}>{assignment.purpose}</p>')
    expect(tabSource).not.toContain('title={`${assignment.companyName} · ${assignment.facilityName}`}')
  })

  it("opens details from pointer and keyboard-accessible rows", () => {
    expect(tabSource).toContain("tabIndex={0}")
    expect(tabSource).toContain('aria-haspopup="dialog"')
    expect(tabSource).toContain("onClick={(event) => openDetails(event.currentTarget)}")
    expect(tabSource).toContain("isFleetRecordActivationKey(event.key)")
    expect(tabSource).toContain("cursor-pointer")
    expect(tabSource).toContain("focus-visible:ring-2")
    expect(tabSource).toContain("setSelectedAssignment(assignment)")
  })

  it("draws row separators without duplicating the pagination divider", () => {
    expect(tabSource).toContain("border-b last:border-b-0 transition-colors")
    expect(tabSource).not.toContain('<tbody className="divide-y">')
  })
})

describe("Fleet assignment read-only detail dialog contract", () => {
  it("shows organization and the full long purpose in a centered dialog", () => {
    expect(dialogSource).toContain("Araç / Şoför Görev Detayı")
    expect(dialogSource).toContain('{assignment.companyName}')
    expect(dialogSource).toContain('{assignment.facilityName}')
    expect(dialogSource).toContain('<span className="whitespace-pre-wrap">{assignment.purpose}</span>')
    expect(dialogSource).toContain("<DialogContent")
    expect(dialogSource).not.toContain("<InternalDialogContent")
  })

  it("contains only report information, not mutation actions or technical metadata", () => {
    for (const value of ["Düzenle", "İptal et", "Sil", "Kaydet", "createdAt", "assignment.id", "resourceId"]) {
      expect(dialogSource).not.toContain(value)
    }
    for (const label of ["Amaç", "Durum", "Şirket", "Tesis", "Araç adı", "Plaka", "Şoför adı", "Planlanan tarih", "Başlangıç", "Bitiş", "Planlanan süre", "İlişkili kayıt"]) {
      expect(dialogSource).toContain(label)
    }
  })
})

describe("Fleet load chart UI contract", () => {
  it("uses a shared fixed axis, accessible truncated labels, and padded explicit domain", () => {
    expect(chartSource).toContain("getFleetCategoryAxisWidth(dimension)")
    expect(chartSource).toContain("truncateFleetCategoryLabel(fullLabel)")
    expect(chartSource).toContain("<title>{fullLabel}</title>")
    expect(chartSource).toContain("domain={[0, durationScale.domainMax]}")
    expect(chartSource).toContain("ticks={durationScale.ticks}")
    expect(chartSource).toContain("right: 124")
  })
})

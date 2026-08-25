import { describe, expect, it, vi } from "vitest"

import { PDF_TURKISH_TEST_STRING, registerReportPdfFont, REPORT_PDF_FONT } from "@/features/reports/report-pdf-font"

describe("report PDF Unicode font", () => {
  it("keeps the Turkish glyph regression string intact", () => {
    expect(PDF_TURKISH_TEST_STRING).toBe("İ ı Ş ş Ğ ğ Ç ç Ö ö Ü ü")
  })

  it("registers and selects the embedded Identity-H Unicode font", () => {
    const doc = {
      addFileToVFS: vi.fn(),
      addFont: vi.fn(),
      setFont: vi.fn(),
    }

    registerReportPdfFont(doc, "font-base64")

    expect(doc.addFileToVFS).toHaveBeenCalledWith(REPORT_PDF_FONT.fileName, "font-base64")
    expect(doc.addFont).toHaveBeenCalledWith(REPORT_PDF_FONT.fileName, REPORT_PDF_FONT.family, "normal", "Identity-H")
    expect(doc.setFont).toHaveBeenCalledWith(REPORT_PDF_FONT.family, "normal")
  })
})

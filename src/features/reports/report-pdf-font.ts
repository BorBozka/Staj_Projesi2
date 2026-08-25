import notoSansFontUrl from "@/assets/fonts/NotoSans-Regular.ttf"

export const PDF_TURKISH_TEST_STRING = "İ ı Ş ş Ğ ğ Ç ç Ö ö Ü ü"

export const REPORT_PDF_FONT = {
  family: "NotoSans",
  fileName: "NotoSans-Regular.ttf",
} as const

type PdfFontDocument = {
  addFileToVFS(fileName: string, fontData: string): void
  addFont(fileName: string, family: string, style: string, encoding?: string): void
  setFont(family: string, style?: string): void
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ""

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }

  return btoa(binary)
}

export async function loadReportPdfFont(): Promise<string> {
  const response = await fetch(notoSansFontUrl)
  if (!response.ok) throw new Error("PDF yazı tipi yüklenemedi.")
  return arrayBufferToBase64(await response.arrayBuffer())
}

export function registerReportPdfFont(doc: PdfFontDocument, fontData: string) {
  doc.addFileToVFS(REPORT_PDF_FONT.fileName, fontData)
  doc.addFont(REPORT_PDF_FONT.fileName, REPORT_PDF_FONT.family, "normal", "Identity-H")
  doc.setFont(REPORT_PDF_FONT.family, "normal")
}

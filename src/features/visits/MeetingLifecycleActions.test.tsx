import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { MeetingLifecycleActions, MeetingLifecycleCustomExtension } from "@/features/visits/MeetingLifecycleActions"

describe("MeetingLifecycleActions", () => {
  it("keeps quick actions in one stable action row and closes without a confirmation surface", () => {
    const markup = renderToStaticMarkup(<MeetingLifecycleActions meetingLabel="Müşteri ziyareti" now={new Date("2026-09-03T08:31:00+03:00")} onExtend={vi.fn().mockResolvedValue(undefined)} onClose={vi.fn().mockResolvedValue(undefined)} />)

    expect(markup).toContain("+15 dk")
    expect(markup).toContain("+30 dk")
    expect(markup).toContain("Özel")
    expect(markup).toContain("Toplantıyı Bitir")
    expect(markup).not.toContain("Çıkış 08:46")
    expect(markup).not.toContain("Toplantıyı bitirmek istiyor musunuz?")
  })

  it("renders the custom-minute editor inline with unit, validation, preview, and cancel actions", () => {
    const markup = renderToStaticMarkup(<MeetingLifecycleCustomExtension meetingLabel="Müşteri ziyareti" now={new Date("2026-09-03T08:31:00+03:00")} value="45" onChange={vi.fn()} onExtend={vi.fn()} onClose={vi.fn()} />)

    expect(markup).toContain('role="group"')
    expect(markup).not.toContain("fixed z-50")
    expect(markup).not.toContain(">Özel uzatma<")
    expect(markup).toContain('value="45"')
    expect(markup).toContain("autofocus")
    expect(markup).toContain("Vazgeç")
    expect(markup).toContain("Uzat")
    expect(markup).toContain("dk")
    expect(markup).toContain('min="5"')
    expect(markup).toContain('step="5"')
    expect(markup).toContain("Yeni çıkış: 09:16")
    expect(markup).not.toContain('aria-label="Özel uzatmayı kapat"')

    const emptyMarkup = renderToStaticMarkup(<MeetingLifecycleCustomExtension meetingLabel="Müşteri ziyareti" now={new Date("2026-09-03T08:31:00+03:00")} value="" onChange={vi.fn()} onExtend={vi.fn()} onClose={vi.fn()} />)
    expect(emptyMarkup).toContain("disabled=\"\"")
  })

  it("locks the compact action and custom-input layout decisions in source", () => {
    const source = readFileSync(new URL("./MeetingLifecycleActions.tsx", import.meta.url), "utf8")

    expect(source).toContain('className="grid grid-cols-3 gap-1.5"')
    expect(source).toContain('className="h-7 w-full text-xs"')
    expect(source).toContain('className="relative min-w-0 flex-1"')
    expect(source).toContain('absolute inset-y-0 right-2')
    expect(source).toContain("Yeni çıkış:")
    expect(source).toContain('variant="default" className="h-7 w-full text-xs"')
    expect(source).not.toContain('variant="destructive"')
    expect(source).toContain('disabled={disabled || !isValidCustomExtensionMinutes(value)}')
    expect(source).not.toContain("'ye alınacak")
    expect(source).not.toContain('rounded-md border border-slate-200 bg-slate-50 p-2.5')
  })
})

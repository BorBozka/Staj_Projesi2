import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { MeetingLifecycleActions, MeetingLifecycleCustomExtensionPopover } from "@/features/visits/MeetingLifecycleActions"

describe("MeetingLifecycleActions", () => {
  it("keeps quick actions in one stable action row and closes without a confirmation surface", () => {
    const markup = renderToStaticMarkup(<MeetingLifecycleActions meetingLabel="Müşteri ziyareti" onExtend={vi.fn().mockResolvedValue(undefined)} onClose={vi.fn().mockResolvedValue(undefined)} />)

    expect(markup).toContain("+15 dk")
    expect(markup).toContain("+30 dk")
    expect(markup).toContain("Özel")
    expect(markup).toContain("Toplantıyı Bitir")
    expect(markup).toContain('aria-haspopup="dialog"')
    expect(markup).not.toContain("Toplantıyı bitirmek istiyor musunuz?")
  })

  it("renders the custom-minute editor as a fixed portal-ready popover with cancel and extend actions", () => {
    const markup = renderToStaticMarkup(<MeetingLifecycleCustomExtensionPopover meetingLabel="Müşteri ziyareti" value="45" onChange={vi.fn()} onExtend={vi.fn()} onClose={vi.fn()} />)

    expect(markup).toContain('role="dialog"')
    expect(markup).toContain("fixed z-50")
    expect(markup).toContain("Özel uzatma")
    expect(markup).toContain('value="45"')
    expect(markup).toContain("autofocus")
    expect(markup).toContain("Vazgeç")
    expect(markup).toContain("Uzat")
    expect(markup).not.toContain('aria-label="Özel uzatmayı kapat"')
  })
})

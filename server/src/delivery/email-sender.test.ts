import { describe, expect, it, vi } from "vitest"

import { LoggingEmailSender } from "./email-sender.js"

describe("LoggingEmailSender", () => {
  it("records delivery metadata without logging an invitation URL or raw token", async () => {
    const info = vi.fn()
    const sender = new LoggingEmailSender({ info, error: vi.fn() })
    await sender.send({ to: { address: "visitor@example.test" }, subject: "Davet", text: "https://web.example.test/visitor/pre-registration?token=raw-secret-token" })
    expect(info).toHaveBeenCalledWith({ recipient: "visitor@example.test", subject: "Davet" }, expect.any(String))
    expect(JSON.stringify(info.mock.calls)).not.toContain("raw-secret-token")
  })
})

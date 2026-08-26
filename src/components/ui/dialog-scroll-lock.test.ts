import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const globalStyles = readFileSync(resolve(process.cwd(), "src/styles/globals.css"), "utf8")
const dialogSource = readFileSync(resolve(process.cwd(), "src/components/ui/dialog.tsx"), "utf8")

describe("global dialog scroll-lock", () => {
  it("uses Radix modal scroll-lock without a competing scrollbar-gutter reservation", () => {
    expect(dialogSource).toContain("@radix-ui/react-dialog")
    expect(globalStyles).not.toMatch(/scrollbar-gutter\s*:/)
    expect(globalStyles).toContain("Radix Dialog scroll-lock")
  })

  it("provides one shared top position for internal main dialogs", () => {
    expect(dialogSource).toContain('className={cn("top-[5vh] translate-y-0", className)}')
    expect(dialogSource).toContain('InternalDialogContent.displayName = "InternalDialogContent"')
  })
})

describe("DialogContent hideOverlay opt-in", () => {
  it("only skips the overlay when a caller explicitly opts in, for a dialog that stays visible behind another one opened on top of it", () => {
    expect(dialogSource).toContain("hideOverlay?: boolean")
    expect(dialogSource).toContain("({ className, children, hideOverlay, ...props }, ref)")
  })

  it("keeps the Overlay permanently mounted and toggles visibility with a class, instead of conditionally rendering it", () => {
    // Root cause of a real nested-dialog bug: Radix's Portal appends each of its children
    // directly to document.body with no shared wrapper, so unmounting/remounting the Overlay
    // (e.g. `{!hideOverlay && <DialogOverlay />}`) makes React re-append it as body's *last*
    // child on remount — after this dialog's own Content — painting the overlay on top of the
    // dialog instead of behind it. The fix keeps the Overlay's DOM node stable for the dialog's
    // whole lifetime and only ever toggles its opacity/pointer-events.
    expect(dialogSource).toContain('<DialogOverlay className={hideOverlay ? "pointer-events-none opacity-0" : undefined} />')
    // The old buggy pattern may still be named in an explanatory comment, but must not appear as
    // live JSX (i.e. not immediately followed by the Content element on the next line).
    expect(dialogSource).not.toMatch(/^\s*\{!hideOverlay && <DialogOverlay \/>\}\s*$/m)
  })
})

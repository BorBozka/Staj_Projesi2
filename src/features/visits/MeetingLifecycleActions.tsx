import { AlertTriangle } from "lucide-react"
import { createPortal } from "react-dom"
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function isPositiveWholeNumberMinutes(value: string) {
  const minutes = Number(value)
  return Number.isInteger(minutes) && minutes > 0
}

interface MeetingLifecycleActionsProps {
  meetingLabel: string
  onExtend(minutes: number): Promise<void>
  onClose(): Promise<void>
  className?: string
}

export function MeetingLifecycleActions({ meetingLabel, onExtend, onClose, className }: MeetingLifecycleActionsProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customMinutes, setCustomMinutes] = useState("")
  const [pendingAction, setPendingAction] = useState<"extend" | "close" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const customInputRef = useRef<HTMLInputElement>(null)
  const customButtonRef = useRef<HTMLButtonElement>(null)

  async function extend(minutes: number) {
    setError(null)
    setPendingAction("extend")
    try {
      await onExtend(minutes)
      setShowCustom(false)
      setCustomMinutes("")
    } catch (extensionError) {
      setError(extensionError instanceof Error ? extensionError.message : "Toplantı uzatılamadı.")
    } finally {
      setPendingAction(null)
    }
  }

  function extendCustom() {
    if (!isPositiveWholeNumberMinutes(customMinutes)) {
      setError("Lütfen pozitif bir tam sayı dakika girin.")
      return
    }
    void extend(Number(customMinutes))
  }

  async function close() {
    setError(null)
    setPendingAction("close")
    try {
      await onClose()
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : "Toplantı kapatılamadı.")
    } finally {
      setPendingAction(null)
    }
  }

  const isBusy = pendingAction !== null

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button type="button" size="sm" variant="outline" className="h-7 bg-white text-xs" disabled={isBusy} onClick={() => void extend(15)}>
          +15 dk
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 bg-white text-xs" disabled={isBusy} onClick={() => void extend(30)}>
          +30 dk
        </Button>
        <div>
          <Button
            ref={customButtonRef}
            type="button"
            size="sm"
            variant="outline"
            className={cn("h-7 bg-white text-xs", showCustom && "bg-slate-100")}
            disabled={isBusy}
            aria-haspopup="dialog"
            aria-expanded={showCustom}
            onClick={() => {
              setError(null)
              setShowCustom((current) => !current)
              window.setTimeout(() => customInputRef.current?.focus(), 0)
            }}
          >
            Özel
          </Button>
          {showCustom && (
            <MeetingLifecycleCustomExtensionPopover
              meetingLabel={meetingLabel}
              value={customMinutes}
              inputRef={customInputRef}
              anchorRef={customButtonRef}
              disabled={isBusy}
              onChange={setCustomMinutes}
              onExtend={extendCustom}
              onClose={() => {
                setShowCustom(false)
                setCustomMinutes("")
                setError(null)
              }}
            />
          )}
        </div>
        <Button type="button" size="sm" variant="destructive" className="h-7 text-xs" disabled={isBusy} onClick={() => void close()}>
          {pendingAction === "close" ? "Bitiriliyor…" : "Toplantıyı Bitir"}
        </Button>
      </div>
      {error && (
        <p className="flex items-start gap-1.5 rounded-md bg-red-50 p-2 text-xs text-red-700" role="alert">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

interface MeetingLifecycleCustomExtensionPopoverProps {
  meetingLabel: string
  value: string
  inputRef?: RefObject<HTMLInputElement | null>
  anchorRef?: RefObject<HTMLElement | null>
  disabled?: boolean
  onChange(value: string): void
  onExtend(): void
  onClose(): void
}

export function MeetingLifecycleCustomExtensionPopover({
  meetingLabel, value, inputRef, anchorRef, disabled = false, onChange, onExtend, onClose,
}: MeetingLifecycleCustomExtensionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    function updatePosition() {
      const anchor = anchorRef?.current
      const popover = popoverRef.current
      if (!anchor || !popover) return
      const anchorRect = anchor.getBoundingClientRect()
      const popoverRect = popover.getBoundingClientRect()
      const edge = 8
      const left = Math.min(Math.max(edge, anchorRect.right - popoverRect.width), window.innerWidth - popoverRect.width - edge)
      const top = anchorRect.top - popoverRect.height - edge >= edge
        ? anchorRect.top - popoverRect.height - edge
        : Math.min(anchorRect.bottom + edge, window.innerHeight - popoverRect.height - edge)
      setPosition({ left, top: Math.max(edge, top) })
    }
    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [anchorRef])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!popoverRef.current?.contains(event.target as Node) && !anchorRef?.current?.contains(event.target as Node)) onClose()
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [anchorRef, onClose])

  const content = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={`${meetingLabel} özel uzatma`}
      className="fixed z-50 w-56 rounded-md border border-slate-200 bg-white p-2.5 shadow-lg"
      style={position ? { left: position.left, top: position.top } : { left: 8, top: 8, visibility: "hidden" }}
    >
      <p className="mb-2 text-xs font-semibold text-slate-800">Özel uzatma</p>
      <div className="flex items-center gap-1.5">
        <Input ref={inputRef} autoFocus type="number" min={1} step={1} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter" && isPositiveWholeNumberMinutes(value)) onExtend()
          if (event.key === "Escape") onClose()
        }} aria-label={`${meetingLabel} özel uzatma dakikası`} placeholder="Dakika" className="h-7 min-w-0 text-xs" />
        <Button type="button" size="sm" className="h-7 text-xs" disabled={disabled} onClick={onExtend}>Uzat</Button>
        <Button type="button" size="sm" variant="outline" className="h-7 shrink-0 text-xs" disabled={disabled} onClick={onClose}>Vazgeç</Button>
      </div>
    </div>
  )

  return typeof document === "undefined" ? content : createPortal(content, document.body)
}

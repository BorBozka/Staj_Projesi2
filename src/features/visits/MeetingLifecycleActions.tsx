import { AlertTriangle } from "lucide-react"
import { useRef, useState, type RefObject } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isTimeBoundVisitType } from "@/domain/visits"
import { getCustomExtensionError, getExtensionPreviewEnd, isValidCustomExtensionMinutes, maximumCustomExtensionMinutes } from "@/features/visits/meeting-extension-utils"
import { formatTr } from "@/lib/date"
import { cn } from "@/lib/utils"

interface MeetingLifecycleActionsProps {
  visitTypeName?: string
  meetingLabel: string
  onExtend(minutes: number): Promise<void>
  onClose(): Promise<void>
  now: Date
  className?: string
}

export function MeetingLifecycleActions({ visitTypeName, meetingLabel, onExtend, onClose, now, className }: MeetingLifecycleActionsProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customMinutes, setCustomMinutes] = useState("")
  const [pendingAction, setPendingAction] = useState<"extend" | "close" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const customInputRef = useRef<HTMLInputElement>(null)

  if (visitTypeName && !isTimeBoundVisitType(visitTypeName)) {
    return null
  }

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
    if (!isValidCustomExtensionMinutes(customMinutes)) return
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
      <div className="grid grid-cols-3 gap-1.5">
          <Button type="button" size="sm" variant="outline" className="h-7 w-full bg-white px-1 text-xs" disabled={isBusy} onClick={() => void extend(15)}>
          +15 dk
        </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 w-full bg-white px-1 text-xs" disabled={isBusy} onClick={() => void extend(30)}>
          +30 dk
        </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn("h-7 w-full bg-white px-1 text-xs", showCustom && "bg-slate-100")}
            disabled={isBusy}
            aria-expanded={showCustom}
            onClick={() => {
              setError(null)
              setShowCustom((current) => !current)
              window.setTimeout(() => customInputRef.current?.focus(), 0)
            }}
          >
            Özel
          </Button>
      </div>
      {showCustom && (
        <MeetingLifecycleCustomExtension
          visitTypeName={visitTypeName}
          meetingLabel={meetingLabel}
          value={customMinutes}
          inputRef={customInputRef}
          now={now}
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
      <Button type="button" size="sm" variant="default" className="h-7 w-full text-xs" disabled={isBusy} onClick={() => void close()}>
          {pendingAction === "close" ? "Bitiriliyor…" : "Toplantıyı Bitir"}
      </Button>
      {error && (
        <p className="flex items-start gap-1.5 rounded-md bg-red-50 p-2 text-xs text-red-700" role="alert">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

interface MeetingLifecycleCustomExtensionProps {
  visitTypeName?: string
  meetingLabel: string
  value: string
  inputRef?: RefObject<HTMLInputElement | null>
  now: Date
  disabled?: boolean
  onChange(value: string): void
  onExtend(): void
  onClose(): void
}

export function MeetingLifecycleCustomExtension({
  visitTypeName, meetingLabel, value, inputRef, now, disabled = false, onChange, onExtend, onClose,
}: MeetingLifecycleCustomExtensionProps) {
  if (visitTypeName && !isTimeBoundVisitType(visitTypeName)) {
    return null
  }

  const validationError = getCustomExtensionError(value)
  const preview = isValidCustomExtensionMinutes(value) ? getExtensionPreviewEnd(now, Number(value)) : null

  return (
    <div
      role="group"
      aria-label={`${meetingLabel} özel uzatma`}
      className="space-y-1.5"
    >
      <div className="flex items-center gap-1.5">
        <div className="relative min-w-0 flex-1">
          <Input ref={inputRef} autoFocus type="number" min={5} max={maximumCustomExtensionMinutes} step={5} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter" && isValidCustomExtensionMinutes(value)) onExtend()
            if (event.key === "Escape") onClose()
          }} aria-label={`${meetingLabel} özel uzatma dakikası`} className="h-7 w-full pr-7 text-xs" />
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-600">dk</span>
        </div>
        <Button type="button" size="sm" className="h-7 text-xs" disabled={disabled || !isValidCustomExtensionMinutes(value)} onClick={onExtend}>Uzat</Button>
        <Button type="button" size="sm" variant="outline" className="h-7 shrink-0 text-xs" disabled={disabled} onClick={onClose}>Vazgeç</Button>
      </div>
      {preview && <p className="text-[11px] text-slate-600">Yeni çıkış: {formatTr(preview, "HH:mm")}</p>}
      {validationError && <p className="whitespace-nowrap text-[11px] text-red-700" role="alert">{validationError}</p>}
    </div>
  )
}

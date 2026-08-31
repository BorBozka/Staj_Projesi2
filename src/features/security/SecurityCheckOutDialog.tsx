import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Visit } from "@/domain/visits"
import { formatTr } from "@/lib/date"
import { cn } from "@/lib/utils"
import { securityService } from "@/services"

interface SecurityCheckOutDialogProps {
  visit: Visit | null
  open: boolean
  onOpenChange(open: boolean): void
  onCheckedOut(visit: Visit): void
}

export function SecurityCheckOutDialog({ visit, open, onOpenChange, onCheckedOut }: SecurityCheckOutDialogProps) {
  const [cardReturned, setCardReturned] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !visit) return
    setCardReturned(null)
    setSubmitting(false)
    setError(null)
  }, [open, visit])

  if (!visit) return null

  const submitDisabled = submitting || cardReturned === null
  const submit = async () => {
    if (submitDisabled) return
    setSubmitting(true)
    setError(null)
    try {
      const updated = await securityService.checkOutVisit({ visitId: visit.id, cardReturned })
      onCheckedOut(updated)
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Çıkış işlemi tamamlanamadı.")
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next) }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Çıkış Yap</DialogTitle></DialogHeader>
        <dl className="grid grid-cols-[76px_minmax(0,1fr)] gap-y-1.5 rounded-md border bg-slate-50/70 p-3 text-xs">
          <dt className="text-slate-500">Ziyaretçi</dt><dd className="font-medium text-slate-900">{visit.visitor.firstName} {visit.visitor.lastName}</dd>
          <dt className="text-slate-500">Kart</dt><dd className="font-medium text-slate-900">{visit.visitorCardNumber ?? "—"}</dd>
          <dt className="text-slate-500">Giriş</dt><dd className="font-medium tabular-nums text-slate-900">{visit.actualCheckIn ? formatTr(new Date(visit.actualCheckIn), "HH:mm") : "—"}</dd>
        </dl>
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-slate-700">Kart teslim durumu</legend>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" aria-pressed={cardReturned === true} className={cn("h-auto min-h-12 justify-start px-3 text-left text-xs", cardReturned === true && "border-emerald-400 bg-emerald-50 text-emerald-800")} onClick={() => setCardReturned(true)}>Kart iade edildi</Button>
            <Button type="button" variant="outline" aria-pressed={cardReturned === false} className={cn("h-auto min-h-12 justify-start px-3 text-left text-xs", cardReturned === false && "border-amber-400 bg-amber-50 text-amber-900")} onClick={() => setCardReturned(false)}>Kart iade edilmedi</Button>
          </div>
        </fieldset>
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>İptal</Button>
          <Button type="button" disabled={submitDisabled} onClick={() => void submit()}>{submitting ? "Çıkış yapılıyor…" : "Çıkışı tamamla"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

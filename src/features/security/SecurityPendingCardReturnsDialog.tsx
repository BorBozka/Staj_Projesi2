import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatTr } from "@/lib/date"
import type { SecurityCardIssue } from "@/services/security-service"

interface SecurityPendingCardReturnsDialogProps {
  issues: SecurityCardIssue[]
  open: boolean
  onOpenChange(open: boolean): void
  onReceive(visitId: string): Promise<void>
}

export function SecurityPendingCardReturnsDialog({ issues, open, onOpenChange, onReceive }: SecurityPendingCardReturnsDialogProps) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const receive = async (visitId: string) => {
    setPendingId(visitId)
    setError(null)
    try {
      await onReceive(visitId)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kart teslim alınamadı.")
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>İade bekleyen kartlar</DialogTitle></DialogHeader>
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{error}</p>}
        <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
          {issues.map(({ card, visit }) => (
            <article key={card.id} className="flex items-center gap-3 rounded-md border p-3 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">Kart {card.cardNumber} · {visit.visitor.firstName} {visit.visitor.lastName}</p>
                <p className="mt-0.5 truncate text-slate-500">{visit.visitor.company}</p>
                <p className="mt-1 tabular-nums text-slate-500">Çıkış: {visit.actualCheckOut ? formatTr(new Date(visit.actualCheckOut), "d MMM · HH:mm") : "—"}</p>
              </div>
              <Button type="button" size="sm" className="h-7 shrink-0 px-2 text-[11px]" disabled={pendingId === visit.id} onClick={() => void receive(visit.id)}>{pendingId === visit.id ? "Alınıyor…" : "Teslim al"}</Button>
            </article>
          ))}
          {issues.length === 0 && <p className="py-8 text-center text-sm text-slate-500">İade bekleyen kart yok.</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

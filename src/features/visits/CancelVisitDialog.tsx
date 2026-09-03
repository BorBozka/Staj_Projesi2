import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Visit } from "@/domain/visits"
import { useVisits } from "@/features/visits/visit-context"

interface Props {
  visit: Visit | null
  open: boolean
  onOpenChange(open: boolean): void
  onSaved(message: string): void
}

export function CancelVisitDialog({ visit, open, onOpenChange, onSaved }: Props) {
  const { visits, cancelVisit, cancelMeeting } = useVisits()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const meetingVisits = visit ? visits.filter((item) => item.meetingId === visit.meetingId) : []
  const cancellableMeetingVisits = meetingVisits.filter((item) => item.status === "PLANNED")
  const protectedMeetingVisits = meetingVisits.filter((item) => item.status === "CHECKED_IN" || item.status === "CHECKED_OUT")
  const showScopeSelection = cancellableMeetingVisits.length > 1
  const visitorName = visit ? `${visit.visitor.firstName} ${visit.visitor.lastName}` : "Bu ziyaretçi"

  const cancel = async (scope: "VISIT" | "MEETING") => {
    if (!visit) return
    setIsSubmitting(true)
    setError(null)
    try {
      if (scope === "MEETING") {
        await cancelMeeting(visit.meetingId)
        onSaved(`${cancellableMeetingVisits.length} iptal edilebilir ziyaret iptal edildi. Kayıtlar geçmişte görünmeye devam edecek.`)
      } else {
        await cancelVisit(visit.id)
        onSaved("Yalnızca seçilen ziyaretçi iptal edildi. Kayıt takvimde görünmeye devam edecek.")
      }
      onOpenChange(false)
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Ziyaret iptal edilemedi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{showScopeSelection ? "İptal kapsamını seçin" : "Ziyaret iptal edilsin mi?"}</DialogTitle>
          <DialogDescription>
            {visit
              ? showScopeSelection
                ? `${visitorName} tek başına veya aynı ziyaretteki ${cancellableMeetingVisits.length} iptal edilebilir ziyaretçi birlikte iptal edilebilir.`
                : `${visitorName} için oluşturulan davet artık geçerli olmayacak.`
              : "Bu ziyaret iptal edilecek."}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
          Kayıt silinmez; ziyaret geçmişinizde iptal edilmiş olarak kalır.
          {protectedMeetingVisits.length > 0 && ` İçeride veya çıkış yapmış ${protectedMeetingVisits.length} ziyaret kaydı toplu iptalden etkilenmez.`}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Vazgeç</Button>
          {showScopeSelection && (
            <Button type="button" variant="outline" className="border-red-200 text-destructive hover:bg-red-50 hover:text-destructive" onClick={() => void cancel("VISIT")} disabled={isSubmitting}>
              {visitorName} · 1 Ziyareti İptal Et
            </Button>
          )}
          <Button type="button" variant="destructive" onClick={() => void cancel(showScopeSelection ? "MEETING" : "VISIT")} disabled={isSubmitting}>
            {isSubmitting ? "İptal ediliyor…" : showScopeSelection ? `${cancellableMeetingVisits.length} Ziyareti Birlikte İptal Et` : "Ziyareti İptal Et"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

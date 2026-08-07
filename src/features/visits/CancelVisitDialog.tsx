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
  const { cancelVisit } = useVisits()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = async () => {
    if (!visit) return
    setIsSubmitting(true)
    setError(null)
    try {
      await cancelVisit(visit.id)
      onSaved("Ziyaret iptal edildi. Kayıt takvimde görünmeye devam edecek.")
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
          <DialogTitle>Planlanan ziyaret iptal edilsin mi?</DialogTitle>
          <DialogDescription>
            {visit ? `${visit.visitor.firstName} ${visit.visitor.lastName} için oluşturulan davet artık geçerli olmayacak.` : "Bu ziyaret iptal edilecek."}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
          Kayıt silinmeyecek; ziyaret geçmişinizde iptal edilmiş durumuyla kalacaktır.
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ziyareti Koru</Button>
          <Button variant="destructive" onClick={cancel} disabled={isSubmitting}>
            {isSubmitting ? "İptal ediliyor…" : "İptal Et"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Visit } from "@/domain/visits"
import { formatTr } from "@/lib/date"

interface SecurityVisitDetailDialogProps {
  visit: Visit | null
  open: boolean
  onOpenChange(open: boolean): void
}

export function SecurityVisitDetailDialog({ visit, open, onOpenChange }: SecurityVisitDetailDialogProps) {
  if (!visit) return null

  const plannedWindow = `${formatDateTime(visit.plannedStart)} – ${formatTr(new Date(visit.plannedEnd), "HH:mm")}`
  const visitorName = `${visit.visitor.firstName} ${visit.visitor.lastName}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Ziyaret detayı</DialogTitle></DialogHeader>
        <dl className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
          <DetailRow label="Ziyaretçi" value={visitorName} />
          <DetailRow label="Firma" value={visit.visitor.company} />
          {visit.visitor.email && <DetailRow label="E-posta" value={visit.visitor.email} />}
          {visit.visitor.phone && <DetailRow label="Telefon" value={visit.visitor.phone} />}
          <DetailRow label="Ev sahibi" value={visit.hostEmployeeName} />
          <DetailRow label="Ziyaret türü" value={visit.visitTypeName} />
          <DetailRow label="Planlanan" value={plannedWindow} />
          {visit.actualCheckIn && <DetailRow label="Giriş" value={formatDateTime(visit.actualCheckIn)} />}
          {visit.visitorCardNumber && <DetailRow label="Ziyaretçi kartı" value={visit.visitorCardNumber} />}
          {visit.vehiclePlate && <DetailRow label="Plaka" value={visit.vehiclePlate} />}
          {visit.note && <DetailRow label="Not" value={visit.note} />}
        </dl>
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Kapat</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <><dt className="text-slate-500">{label}</dt><dd className="min-w-0 font-medium text-slate-900">{value}</dd></>
}

function formatDateTime(value: string) {
  return formatTr(new Date(value), "d MMM yyyy · HH:mm")
}

import { Building2, CalendarClock, Mail, MapPin, Pencil, UserRound, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Visit } from "@/domain/visits"
import { VisitStatusBadge } from "@/features/visits/VisitStatusBadge"
import { formatTr } from "@/lib/date"

interface Props {
  visit: Visit | null
  open: boolean
  onOpenChange(open: boolean): void
  onEdit(visit: Visit): void
  onReschedule(visit: Visit): void
  onCancel(visit: Visit): void
  readOnly?: boolean
}

export function VisitDetailsDialog({ visit, open, onOpenChange, onEdit, onReschedule, onCancel, readOnly = false }: Props) {
  if (!visit) return null

  const openAction = (action: (visit: Visit) => void) => {
    onOpenChange(false)
    action(visit)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" onOpenAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 pr-7">
            <DialogTitle>{visit.visitor.firstName} {visit.visitor.lastName}</DialogTitle>
            <VisitStatusBadge status={visit.status} />
          </div>
          <DialogDescription>Ziyaret planı ve davet bilgileri</DialogDescription>
        </DialogHeader>

        <dl className="grid gap-3 rounded-md border bg-slate-50/60 p-3 text-[13px] sm:grid-cols-2">
          <Detail icon={Mail} label="E-posta" value={visit.visitor.email} className="sm:col-span-2" />
          <Detail icon={CalendarClock} label="Tarih ve saat" value={`${formatTr(new Date(visit.plannedStart), "d MMMM yyyy EEEE · HH:mm")}–${formatTr(new Date(visit.plannedEnd), "HH:mm")}`} className="sm:col-span-2" />
          <Detail icon={UserRound} label="İlgili personel" value={visit.hostEmployeeName} />
          <Detail icon={Building2} label="Şirket" value={visit.hostCompanyName} />
          <Detail icon={MapPin} label="Tesis" value={visit.facilityName} />
          <Detail icon={CalendarClock} label="Ziyaret türü" value={visit.visitTypeName} />
          {visit.note && <Detail icon={Pencil} label="Not / Açıklama" value={visit.note} className="sm:col-span-2" />}
        </dl>

        {!readOnly && visit.status === "PLANNED" && (
          <DialogFooter className="[&>button]:h-8 sm:[&>button]:w-28">
            <Button variant="outline" className="border-red-200 text-destructive hover:border-red-300 hover:bg-red-100 hover:text-destructive hover:shadow-sm" onClick={() => openAction(onCancel)}><XCircle />İptal Et</Button>
            <Button variant="outline" className="hover:border-slate-300 hover:bg-slate-200 hover:text-slate-950 hover:shadow-sm" onClick={() => openAction(onReschedule)}><CalendarClock />Ertele</Button>
            <Button className="hover:bg-primary/80 hover:shadow-md" onClick={() => openAction(onEdit)}><Pencil />Düzenle</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Detail({ icon: Icon, label, value, className }: { icon: typeof Mail; label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon className="size-3.5" />{label}</dt>
      <dd className="mt-1 break-words font-medium text-slate-800">{value}</dd>
    </div>
  )
}

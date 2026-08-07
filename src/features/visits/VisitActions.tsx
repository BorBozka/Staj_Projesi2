import { CalendarClock, Eye, MoreHorizontal, Pencil, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Visit } from "@/domain/visits"

interface Props {
  visit: Visit
  onView(visit: Visit): void
  onEdit(visit: Visit): void
  onReschedule(visit: Visit): void
  onCancel(visit: Visit): void
}

export function VisitActions({ visit, onView, onEdit, onReschedule, onCancel }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`${visit.visitor.firstName} ${visit.visitor.lastName} için işlemler`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onView(visit)}><Eye className="size-3.5" />Detayları Gör</DropdownMenuItem>
        {visit.status === "PLANNED" && (
          <>
            <DropdownMenuItem onSelect={() => onEdit(visit)}><Pencil className="size-3.5" />Düzenle</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onReschedule(visit)}><CalendarClock className="size-3.5" />Ertele</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:bg-red-50 focus:text-destructive" onSelect={() => onCancel(visit)}>
              <XCircle className="size-3.5" />İptal Et
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

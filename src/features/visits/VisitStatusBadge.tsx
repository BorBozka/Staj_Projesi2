import { Circle, CircleCheck, CircleMinus, CircleX, LogIn } from "lucide-react"

import { visitStatusLabels, type VisitStatus } from "@/domain/visits"
import { visitStatusSurfaces } from "@/features/visits/visit-status-styles"
import { cn } from "@/lib/utils"

const icons = {
  PLANNED: Circle,
  CHECKED_IN: LogIn,
  CHECKED_OUT: CircleCheck,
  CANCELLED: CircleX,
  NO_SHOW: CircleMinus,
} satisfies Record<VisitStatus, typeof Circle>

export function VisitStatusBadge({ status, compact = false }: { status: VisitStatus; compact?: boolean }) {
  const Icon = icons[status]
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full border font-medium",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]",
        visitStatusSurfaces[status],
      )}
    >
      <Icon className={compact ? "size-2.5" : "size-3"} />
      {visitStatusLabels[status]}
    </span>
  )
}

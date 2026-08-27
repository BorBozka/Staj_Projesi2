import { cn } from "@/lib/utils"

export function ActiveStatusPill({ active, className }: { active: boolean; className?: string }) {
  return (
    <span className={cn(
      "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
      active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600",
      className,
    )}>
      {active ? "Aktif" : "Pasif"}
    </span>
  )
}

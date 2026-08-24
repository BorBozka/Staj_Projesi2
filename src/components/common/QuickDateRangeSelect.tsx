import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { matchesQuickDateRange, type QuickDateRangeOption } from "@/lib/quick-date-range"
import { cn } from "@/lib/utils"

interface QuickDateRangeSelectProps {
  id?: string
  options: QuickDateRangeOption[]
  startDate: string
  endDate: string
  onSelect(startDate: string, endDate: string): void
  className?: string
  ariaLabel?: string
}

export function QuickDateRangeSelect({ id, options, startDate, endDate, onSelect, className, ariaLabel = "Hızlı tarih aralığı" }: QuickDateRangeSelectProps) {
  const active = options.find((option) => matchesQuickDateRange({ startDate, endDate }, option))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn("h-8 w-full justify-between gap-1.5 bg-white px-2.5 text-left text-xs font-normal text-slate-700 shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-300", className)}
          aria-label={`${ariaLabel}. ${active?.label ?? "Özel aralık"}`}
        >
          <span className="truncate">{active?.label ?? "Özel aralık"}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40 p-1.5" aria-label={`${ariaLabel} seçimi`}>
        <DropdownMenuRadioGroup
          value={active?.key ?? ""}
          onValueChange={(key) => {
            const option = options.find((item) => item.key === key)
            if (option) onSelect(option.startDate, option.endDate)
          }}
        >
          {options.map((option) => <DropdownMenuRadioItem key={option.key} value={option.key}>{option.label}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

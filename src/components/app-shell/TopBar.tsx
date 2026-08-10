import { Bell, Building2, Menu } from "lucide-react"

import { Button } from "@/components/ui/button"

interface TopBarProps {
  onOpenNavigation(): void
  navigationOpen: boolean
}

export function TopBar({ onOpenNavigation, navigationOpen }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[50px] items-center justify-between border-b bg-card/95 px-3 backdrop-blur md:px-5">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={onOpenNavigation}
          aria-label={"Men\u00fcy\u00fc a\u00e7"}
          aria-controls="mobile-navigation"
          aria-expanded={navigationOpen}
        >
          <Menu />
        </Button>
        <div
          className="flex h-7 items-center gap-1.5 rounded-md border bg-white px-2 text-xs font-medium text-slate-700 shadow-sm"
          aria-label={"Ge\u00e7erli \u015firket ve tesis"}
        >
          <Building2 className="size-3.5 text-slate-500" />
          <span className="hidden sm:inline">{"BPLAS A.\u015e."}</span>
          <span className="hidden text-slate-300 sm:inline">/</span>
          <span>Merkez Tesis</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon-sm" aria-label="Bildirimler" className="relative">
          <Bell />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-blue-600" />
        </Button>
        <div className="ml-1 flex items-center gap-1.5 border-l pl-2.5">
          <div className="flex size-[26px] items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-white">MK</div>
          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-medium">Maya Kara</p>
            <p className="text-xs text-muted-foreground">{"\u00c7al\u0131\u015fan"}</p>
          </div>
        </div>
      </div>
    </header>
  )
}

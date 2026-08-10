import { CalendarDays, ShieldCheck } from "lucide-react"
import { NavLink } from "react-router-dom"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface MobileNavigationProps {
  open: boolean
  onOpenChange(open: boolean): void
}

export function MobileNavigation({ open, onOpenChange }: MobileNavigationProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="mobile-navigation"
        className="left-0 top-0 h-dvh max-h-none w-[min(18rem,calc(100%-3rem))] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-y-0 border-l-0 bg-slate-950 p-0 text-slate-200 [&>button]:text-slate-400 [&>button:hover]:text-white"
      >
        <DialogHeader className="border-b border-slate-800 px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-[30px] shrink-0 items-center justify-center rounded-md bg-blue-600 text-white shadow-sm">
              <ShieldCheck className="size-[18px]" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm text-white">BPLAS</DialogTitle>
              <DialogDescription className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{"Ziyaret Y\u00f6netimi"}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <nav className="px-1.5 py-2.5" aria-label={"\u00c7al\u0131\u015fan men\u00fcs\u00fc"}>
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{"\u00c7al\u0131\u015fan"}</p>
          <NavLink
            to="/my-visits"
            onClick={() => onOpenChange(false)}
            className={({ isActive }) =>
              cn(
                "flex h-9 items-center gap-3 rounded-md px-2.5 text-sm transition-colors",
                isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
              )
            }
          >
            <CalendarDays className="size-4 shrink-0" />
            <span>Ziyaretlerim</span>
          </NavLink>
        </nav>
      </DialogContent>
    </Dialog>
  )
}

import type { ReactNode } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface DrawerShellProps {
  open: boolean
  onOpenChange(open: boolean): void
  /**
   * Called before the drawer is closed (e.g., user clicks the ✕ button or
   * presses Escape). Return `false` to prevent the close; any other return
   * value (including `undefined`) allows it.
   */
  onBeforeClose?: () => boolean | undefined
  onCloseAutoFocus?: (event: Event) => void
  ariaDescribedBy?: string
  children: ReactNode
  className?: string
  widthClass?: string
}

export function DrawerShell({
  open,
  onOpenChange,
  onBeforeClose,
  onCloseAutoFocus,
  ariaDescribedBy = undefined,
  children,
  className,
  widthClass = "max-w-[540px] sm:w-[min(540px,calc(100vw-2rem))]",
}: DrawerShellProps) {
  function handleOpenChange(nextOpen: boolean) {
    // nextOpen === false means the user is attempting to close
    if (!nextOpen && onBeforeClose) {
      if (onBeforeClose() === false) return
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "left-auto right-0 top-0 h-dvh max-h-none w-full translate-x-0 translate-y-0 content-start gap-0 overflow-y-auto rounded-none border-y-0 border-r-0 p-0 shadow-2xl [&>button]:right-3 [&>button]:top-3 [&>button]:z-20 [&>button]:flex [&>button]:size-8 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md [&>button]:hover:bg-slate-100",
          widthClass,
          className,
        )}
        aria-describedby={ariaDescribedBy}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

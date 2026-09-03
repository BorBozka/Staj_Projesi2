import type { ReactNode } from "react"

import bplasLogo from "@/assets/bplas-logo.svg"
import { AccountMenu } from "@/components/account/AccountMenu"
import type { AccountProfile } from "@/features/account/account-profile"

/** Compact header height in px — single source for layout maths in child pages. */
export const FOCUSED_SHELL_HEADER_HEIGHT = 52

interface FocusedShellProps {
  /** Short product/role name shown next to the logo. */
  title: string
  account: AccountProfile
  /** Optional role-specific navigation rendered beside the title. */
  headerNavigation?: ReactNode
  /** Optional content pinned to the true center of the header. */
  headerCenter?: ReactNode
  /** Header height in pixels; defaults to the compact shared-shell height. */
  headerHeight?: number
  /** Optional content-area layout overrides for a role-specific shell. */
  contentClassName?: string
  children: ReactNode
}

/**
 * Sidebar-less application shell: full-viewport layout, a compact global header
 * with a logo/title area, optional header navigation and centered content, and
 * a profile slot plus a scroll-contained main area. Presentation only — role-specific
 * routing and business logic live in the wrapping shell.
 */
export function FocusedShell({ title, account, headerNavigation, headerCenter, headerHeight = FOCUSED_SHELL_HEADER_HEIGHT, contentClassName, children }: FocusedShellProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50">
      <header
        className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b bg-white/95 px-4 backdrop-blur"
        style={{ height: headerHeight }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <img src={bplasLogo} alt="BPLAS" className="size-7 shrink-0 rounded-md object-cover shadow-sm" />
          <span className="truncate text-sm font-semibold text-slate-900">{title}</span>
          {headerNavigation}
        </div>

        <div className="flex items-center justify-center">{headerCenter}</div>

        <div className="flex min-w-0 items-center justify-end"><AccountMenu profile={account} /></div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        <div className={`mx-auto h-full w-full max-w-[1600px] px-3 py-3 md:px-5 lg:px-6 ${contentClassName ?? ""}`}>{children}</div>
      </main>
    </div>
  )
}

import type { ReactNode } from "react"

import bplasLogo from "@/assets/bplas-logo.svg"

/** Compact header height in px — single source for layout maths in child pages. */
export const FOCUSED_SHELL_HEADER_HEIGHT = 52

interface FocusedShellProps {
  /** Short product/role name shown next to the logo. */
  title: string
  userName: string
  userInitials: string
  roleLabel: string
  /** Optional centered route navigation. */
  navigation?: ReactNode
  children: ReactNode
}

/**
 * Sidebar-less application shell: full-viewport layout, a compact global header
 * with a logo/title area, an optional centered navigation slot and a profile
 * slot, plus a scroll-contained main area. Presentation only — role-specific
 * routing and business logic live in the wrapping shell.
 */
export function FocusedShell({ title, userName, userInitials, roleLabel, navigation, children }: FocusedShellProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50">
      <header
        className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b bg-white/95 px-4 backdrop-blur"
        style={{ height: FOCUSED_SHELL_HEADER_HEIGHT }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <img src={bplasLogo} alt="BPLAS" className="size-7 shrink-0 rounded-md object-cover shadow-sm" />
          <span className="truncate text-sm font-semibold text-slate-900">{title}</span>
        </div>

        <div className="flex items-center justify-center">{navigation}</div>

        <div className="flex items-center justify-end gap-2">
          <div className="hidden text-right leading-tight sm:block">
            <p className="truncate text-xs font-semibold text-slate-900">{userName}</p>
            <p className="truncate text-[11px] text-slate-500">{roleLabel}</p>
          </div>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
            {userInitials}
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto h-full w-full max-w-[1600px] px-3 py-3 md:px-5 lg:px-6">{children}</div>
      </main>
    </div>
  )
}

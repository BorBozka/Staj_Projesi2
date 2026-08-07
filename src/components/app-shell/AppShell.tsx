import { Outlet } from "react-router-dom"
import { useState } from "react"

import { Sidebar } from "@/components/app-shell/Sidebar"
import { TopBar } from "@/components/app-shell/TopBar"

export function AppShell() {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      <div className={collapsed ? "md:pl-[60px]" : "md:pl-52"}>
        <TopBar onOpenNavigation={() => setCollapsed(false)} />
        <main className="mx-auto w-full max-w-[1600px] px-3 py-2 md:px-5 lg:px-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

import { Outlet } from "react-router-dom"
import { useState } from "react"

import { MobileNavigation } from "@/components/app-shell/MobileNavigation"
import { Sidebar } from "@/components/app-shell/Sidebar"
import { TopBar } from "@/components/app-shell/TopBar"

export function AppShell() {
  const [collapsed, setCollapsed] = useState(true)
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      <MobileNavigation open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen} />
      <div className={collapsed ? "md:pl-[60px]" : "md:pl-52"}>
        <TopBar onOpenNavigation={() => setMobileNavigationOpen(true)} navigationOpen={mobileNavigationOpen} />
        <main className="mx-auto w-full max-w-[1600px] px-3 py-2 md:px-5 lg:px-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

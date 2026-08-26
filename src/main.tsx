import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import { App } from "@/app/App"
import { ResourceProvider } from "@/features/resources/resource-context"
import { AdminProvider } from "@/features/admin/admin-context"
import { VisitProvider } from "@/features/visits/visit-context"
import { adminService, resourceCatalogService, visitService } from "@/services"
import "@/styles/globals.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <VisitProvider service={visitService}>
        <AdminProvider service={adminService}>
          <ResourceProvider service={resourceCatalogService}>
            <App />
          </ResourceProvider>
        </AdminProvider>
      </VisitProvider>
    </BrowserRouter>
  </StrictMode>,
)

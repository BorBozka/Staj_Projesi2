import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router-dom"

import { App } from "@/app/App"
import { ResourceProvider } from "@/features/resources/resource-context"
import { AdminProvider } from "@/features/admin/admin-context"
import { VisitProvider } from "@/features/visits/visit-context"
import { adminService, resourceCatalogService, visitService } from "@/services"
import "@/styles/globals.css"

const router = createBrowserRouter([{
  path: "*",
  element: (
    <StrictMode>
      <VisitProvider service={visitService}>
        <AdminProvider service={adminService}>
          <ResourceProvider service={resourceCatalogService}>
            <App />
          </ResourceProvider>
        </AdminProvider>
      </VisitProvider>
    </StrictMode>
  ),
}])

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
)

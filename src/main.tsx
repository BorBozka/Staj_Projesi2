import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router-dom"

import { App } from "@/app/App"
import { AuthProvider } from "@/features/auth/auth-context"
import { ResourceProvider } from "@/features/resources/resource-context"
import { AdminProvider } from "@/features/admin/admin-context"
import { VisitProvider } from "@/features/visits/visit-context"
import { adminService, resourceCatalogService, sessionService, visitService } from "@/services"
import "@/styles/globals.css"

const router = createBrowserRouter([{
  path: "*",
  element: (
    <StrictMode>
      <AuthProvider service={sessionService}>
        <VisitProvider service={visitService}>
          <AdminProvider service={adminService}>
            <ResourceProvider service={resourceCatalogService}>
              <App />
            </ResourceProvider>
          </AdminProvider>
        </VisitProvider>
      </AuthProvider>
    </StrictMode>
  ),
}])

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
)

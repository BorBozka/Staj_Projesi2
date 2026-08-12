import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import { App } from "@/app/App"
import { ResourceProvider } from "@/features/resources/resource-context"
import { VisitProvider } from "@/features/visits/visit-context"
import { resourceCatalogService, visitService } from "@/services"
import "@/styles/globals.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <VisitProvider service={visitService}>
        <ResourceProvider service={resourceCatalogService}>
          <App />
        </ResourceProvider>
      </VisitProvider>
    </BrowserRouter>
  </StrictMode>,
)

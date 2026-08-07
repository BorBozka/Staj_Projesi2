import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import { App } from "@/app/App"
import { VisitProvider } from "@/features/visits/visit-context"
import { visitService } from "@/services"
import "@/styles/globals.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <VisitProvider service={visitService}>
        <App />
      </VisitProvider>
    </BrowserRouter>
  </StrictMode>,
)

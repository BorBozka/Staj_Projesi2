import { describe, expect, it } from "vitest"

import { OrganizationService } from "./service.js"
import { InMemoryOrganizationRepository } from "./testing/in-memory-organization-repository.js"

const at = "2026-01-01T00:00:00.000Z"
const entity = (id: string, name: string, active = true, parentId?: string) => ({ id, name, active, ...(parentId ? { parentId } : {}), createdAt: at, updatedAt: at })

describe("OrganizationService", () => {
  it("rejects an active child under an inactive parent", async () => {
    const service = new OrganizationService(new InMemoryOrganizationRepository({ companies: [entity("company-1", "BPLAS", false)] }))
    await expect(service.save("FACILITY", { parentId: "company-1", name: "Merkez", active: true })).rejects.toMatchObject({ code: "INACTIVE_PARENT" })
  })

  it("keeps parent relationships immutable and prevents parent deactivation with active children", async () => {
    const service = new OrganizationService(new InMemoryOrganizationRepository({ companies: [entity("company-1", "BPLAS"), entity("company-2", "Diğer")], facilities: [entity("facility-1", "Merkez", true, "company-1")] }))
    await expect(service.save("FACILITY", { id: "facility-1", parentId: "company-2", name: "Merkez", active: true })).rejects.toMatchObject({ code: "PARENT_IMMUTABLE" })
    await expect(service.save("COMPANY", { id: "company-1", name: "BPLAS", active: false })).rejects.toMatchObject({ code: "ACTIVE_CHILDREN" })
  })

  it("returns active-only operational lookups unless inactive records are requested", async () => {
    const service = new OrganizationService(new InMemoryOrganizationRepository({ companies: [entity("active", "Aktif"), entity("passive", "Pasif", false)] }))
    expect(await service.list("COMPANY")).toHaveLength(1)
    expect(await service.list("COMPANY", true)).toHaveLength(2)
  })
})

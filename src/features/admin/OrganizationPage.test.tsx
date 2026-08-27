import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { OrganizationHierarchy, OrganizationWorkspace } from "@/features/admin/OrganizationPage"
import {
  companyNodeKey,
  departmentsGroupKey,
  facilitiesGroupKey,
  facilityNodeKey,
  getDefaultOrganizationNavigation,
  getOrganizationTreeKeyboardAction,
  getVisibleOrganizationTreeItems,
} from "@/features/admin/organization-tree"
import { initialMockOrganizationSnapshot } from "@/services/mock-organization-store"

const organization = structuredClone(initialMockOrganizationSnapshot)
const noop = () => undefined
const pageSource = readFileSync(resolve(process.cwd(), "src/features/admin/OrganizationPage.tsx"), "utf8")

function hierarchyMarkup(expandedKeys = getDefaultOrganizationNavigation(organization).expandedKeys) {
  return renderToStaticMarkup(
    <OrganizationHierarchy
      organization={organization}
      selection={{ kind: "COMPANY", id: "bplas" }}
      expandedKeys={expandedKeys}
      focusKey={companyNodeKey("bplas")}
      onExpandedKeysChange={noop}
      onFocusKeyChange={noop}
      onSelect={noop}
    />,
  )
}

function workspaceMarkup(kind: "COMPANY" | "FACILITY" | "DEPARTMENT" | "SECURITY_GATE", id: string) {
  return renderToStaticMarkup(<OrganizationWorkspace organization={organization} selection={{ kind, id }} onSelect={noop} />)
}

describe("Organization hierarchy projection", () => {
  it("renders every canonical Company at tree root level", () => {
    const roots = getVisibleOrganizationTreeItems(organization, new Set()).filter((item) => item.parentKey === null)
    expect(roots.map((item) => item.label)).toEqual(["BPLAS A.Ş.", "BPLAS Otomotiv A.Ş.", "Anadolu Lojistik A.Ş."])
  })

  it("places each Facility and Department only below its own Company grouping node", () => {
    const expanded = new Set([companyNodeKey("bplas"), facilitiesGroupKey("bplas"), departmentsGroupKey("bplas")])
    const items = getVisibleOrganizationTreeItems(organization, expanded)
    expect(items.find((item) => item.label === "Merkez Tesis")?.parentKey).toBe(facilitiesGroupKey("bplas"))
    expect(items.find((item) => item.label === "Satın Alma")?.parentKey).toBe(departmentsGroupKey("bplas"))
    expect(items.some((item) => item.label === "Üretim Tesisi")).toBe(false)
    expect(items.some((item) => item.label === "Üretim")).toBe(false)
  })

  it("places SecurityGate records only below their Facility", () => {
    const expanded = new Set([companyNodeKey("bplas"), facilitiesGroupKey("bplas"), facilityNodeKey("bplas-merkez")])
    const gates = getVisibleOrganizationTreeItems(organization, expanded).filter((item) => item.entityKind === "SECURITY_GATE")
    expect(gates.map((item) => [item.label, item.parentKey])).toEqual([
      ["Ana Giriş", facilityNodeKey("bplas-merkez")],
      ["Lojistik Kapısı", facilityNodeKey("bplas-merkez")],
    ])
  })

  it("keeps grouping nodes navigational and never models them as selected domain entities", () => {
    const items = getVisibleOrganizationTreeItems(organization, getDefaultOrganizationNavigation(organization).expandedKeys)
    const groups = items.filter((item) => item.nodeType === "GROUP")
    expect(groups.map((item) => item.label)).toEqual(["Tesisler", "Departmanlar"])
    expect(groups.every((item) => item.entity === undefined && item.entityKind === undefined)).toBe(true)
  })

  it("changes the visible node set when Company/group nodes collapse or expand", () => {
    const collapsed = getVisibleOrganizationTreeItems(organization, new Set())
    const expanded = getVisibleOrganizationTreeItems(organization, new Set([companyNodeKey("bplas"), facilitiesGroupKey("bplas")]))
    expect(collapsed).toHaveLength(3)
    expect(expanded.some((item) => item.label === "Merkez Tesis")).toBe(true)
    expect(expanded.some((item) => item.label === "Satın Alma")).toBe(false)
  })

  it("keeps passive entities visible and labels them without disabling selection", () => {
    const markup = hierarchyMarkup(new Set([companyNodeKey("bplas"), facilitiesGroupKey("bplas"), facilityNodeKey("bplas-arge")]))
    expect(markup).toContain("Eski Giriş")
    expect(markup).toContain("Pasif")
    expect(markup).not.toContain("disabled")
  })
})

describe("Organization contextual workspace", () => {
  it("shows the selected Company with its own Facilities and Departments", () => {
    const markup = workspaceMarkup("COMPANY", "bplas")
    expect(markup).toContain("BPLAS A.Ş.")
    expect(markup).toContain("Merkez Tesis")
    expect(markup).toContain("Ar-Ge Merkezi")
    expect(markup).toContain("Satın Alma")
    expect(markup).not.toContain("Üretim Tesisi")
  })

  it("shows the selected Facility with only its SecurityGates", () => {
    const markup = workspaceMarkup("FACILITY", "bplas-merkez")
    expect(markup).toContain("BPLAS A.Ş. / Tesis")
    expect(markup).toContain("Ana Giriş")
    expect(markup).toContain("Lojistik Kapısı")
    expect(markup).not.toContain("Ziyaretçi Girişi")
  })

  it("shows Department parent Company details", () => {
    const markup = workspaceMarkup("DEPARTMENT", "department-bplas-satin-alma")
    expect(markup).toContain("Departman adı")
    expect(markup).toContain("Satın Alma")
    expect(markup).toContain("Bağlı şirket")
    expect(markup).toContain("BPLAS A.Ş.")
  })

  it("shows SecurityGate parent Facility and Company details", () => {
    const markup = workspaceMarkup("SECURITY_GATE", "gate-bplas-merkez-ana-giris")
    expect(markup).toContain("Kapı adı")
    expect(markup).toContain("Merkez Tesis")
    expect(markup).toContain("BPLAS A.Ş.")
  })

  it("wires child workspace rows back to the shared entity selection callback", () => {
    expect(pageSource).toContain('onSelect={(id) => onSelect({ kind: "FACILITY", id })}')
    expect(pageSource).toContain('onSelect={(id) => onSelect({ kind: "DEPARTMENT", id })}')
    expect(pageSource).toContain('onSelect={(id) => onSelect({ kind: "SECURITY_GATE", id })}')
    expect(pageSource).toContain("getExpansionKeysForSelection(organization, next)")
  })
})

describe("Organization tree accessibility and phase boundary", () => {
  it("renders tree/treeitem semantics, roving focus, selection, and expandable state", () => {
    const markup = hierarchyMarkup()
    expect(markup).toContain('role="tree"')
    expect(markup).toContain('role="treeitem"')
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('aria-selected="true"')
    expect(markup).toContain('tabindex="0"')
  })

  it("supports Up/Down, Right/Left, and Enter/Space keyboard actions", () => {
    const expanded = getDefaultOrganizationNavigation(organization).expandedKeys
    const items = getVisibleOrganizationTreeItems(organization, expanded)
    expect(getOrganizationTreeKeyboardAction("ArrowDown", companyNodeKey("bplas"), items, expanded)).toEqual({ type: "FOCUS", key: facilitiesGroupKey("bplas") })
    expect(getOrganizationTreeKeyboardAction("ArrowLeft", companyNodeKey("bplas"), items, expanded)).toEqual({ type: "COLLAPSE", key: companyNodeKey("bplas") })
    expect(getOrganizationTreeKeyboardAction("ArrowRight", facilitiesGroupKey("bplas"), items, expanded)).toEqual({ type: "FOCUS", key: facilityNodeKey("bplas-merkez") })
    expect(getOrganizationTreeKeyboardAction("Enter", companyNodeKey("bplas"), items, expanded)).toEqual({ type: "ACTIVATE" })
    expect(getOrganizationTreeKeyboardAction(" ", companyNodeKey("bplas"), items, expanded)).toEqual({ type: "ACTIVATE" })
  })

  it("does not expose create, edit, delete, or mutation affordances in phase 2", () => {
    expect(pageSource).not.toContain("adminService")
    expect(pageSource).not.toContain("OrganizationDialog")
    expect(pageSource).not.toContain("Pencil")
    expect(pageSource).not.toContain("+ Ekle")
    expect(pageSource).not.toContain("Kaydet")
    expect(pageSource).not.toContain("Sil")
  })
})

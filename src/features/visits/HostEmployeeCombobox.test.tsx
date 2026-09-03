import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type { EmployeeOption } from "@/domain/visits"
import { HostEmployeeCombobox } from "@/features/visits/HostEmployeeCombobox"

const source = readFileSync(resolve(process.cwd(), "src/features/visits/HostEmployeeCombobox.tsx"), "utf8")

const roster: EmployeeOption[] = [
  { id: "maya", companyId: "bplas", facilityIds: ["merkez"], name: "Maya Kara", departmentId: "d", department: "Satın Alma" },
  { id: "emre", companyId: "bplas", facilityIds: ["merkez"], name: "Emre Yılmaz", departmentId: "d", department: "Mühendislik" },
]

describe("HostEmployeeCombobox structure", () => {
  it("is a keyboard combobox with a listbox of options, not a plain text field", () => {
    expect(source).toContain('role="combobox"')
    expect(source).toContain('role="listbox"')
    expect(source).toContain('role="option"')
    expect(source).toContain("aria-activedescendant")
    expect(source).toContain('aria-autocomplete="list"')
  })

  it("only commits a value chosen from the list — there is no free-text path", () => {
    // The value is reported up only from the list-item commit; the text input's
    // own onChange feeds the local query, never the form value.
    expect(source).toContain("const commit = (employee: EmployeeOption) => {")
    expect(source).toContain("onChange(employee.id, employee.name)")
    expect(source).not.toContain("onChange(query")
    expect(source).not.toContain("onChange(event.target.value")
  })

  it("discards a half-typed query when the field loses focus", () => {
    expect(source).toContain("onBlur={() => {")
    expect(source).toContain("close()")
    expect(source).toContain("setQuery(\"\")")
  })

  it("handles Enter, Escape and arrow keys", () => {
    expect(source).toContain('event.key === "Enter"')
    expect(source).toContain('event.key === "Escape"')
    expect(source).toContain('event.key === "ArrowDown"')
    expect(source).toContain('event.key === "ArrowUp"')
  })

  it("shows an explicit empty state and avoids horizontal overflow on long names", () => {
    expect(source).toContain("Sonuç bulunamadı")
    expect(source).toContain("truncate")
    expect(source).toContain("title={employee.name}")
  })

  it("floats the results over the form instead of reflowing the fields below it", () => {
    expect(source).toContain("createPortal(panel, portalHost)")
    expect(source).toContain('position: "absolute"')
    expect(source).toContain('wrapper.closest<HTMLElement>(\'[role="dialog"]\')')
    // Re-anchors to the field while open rather than leaving a detached panel behind.
    expect(source).toContain('window.addEventListener("resize", reposition)')
    expect(source).toContain('document.addEventListener("scroll", reposition, true)')
  })
})

describe("HostEmployeeCombobox rendering", () => {
  it("renders closed with the selected employee name shown", () => {
    const html = renderToStaticMarkup(
      <HostEmployeeCombobox
        employees={roster}
        companyId="bplas"
        facilityId="merkez"
        value="maya"
        onChange={() => {}}
      />,
    )
    expect(html).toContain('role="combobox"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('value="Maya Kara"')
  })

  it("falls back to selectedName when the id is not in the scoped roster", () => {
    const html = renderToStaticMarkup(
      <HostEmployeeCombobox
        employees={roster}
        companyId="bplas"
        facilityId="merkez"
        value="left-the-company"
        selectedName="Ayrılmış Personel"
        onChange={() => {}}
      />,
    )
    expect(html).toContain('value="Ayrılmış Personel"')
  })

  it("renders disabled when company or facility is missing", () => {
    const html = renderToStaticMarkup(
      <HostEmployeeCombobox employees={roster} companyId="" facilityId="" value="" disabled onChange={() => {}} />,
    )
    expect(html).toContain("disabled")
  })
})

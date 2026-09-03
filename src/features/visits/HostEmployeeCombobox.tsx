import { forwardRef, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { Input } from "@/components/ui/input"
import type { EmployeeOption } from "@/domain/visits"
import { filterHostEmployees } from "@/features/visits/host-employee-search"
import { cn } from "@/lib/utils"

/** Cap the visible rows so opening the field with an empty query never dumps a
 * few hundred nodes into the DOM. The count of hidden matches is surfaced so the
 * user knows to keep typing. */
const RESULT_LIMIT = 50

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

interface HostEmployeeComboboxProps {
  id?: string
  name?: string
  /** The full reference-data roster; scoping to company/facility happens here. */
  employees: EmployeeOption[]
  companyId: string
  facilityId: string
  /** Selected employee id, or "" when nothing is chosen. */
  value: string
  /** Shown when the selected id is not in the scoped roster (e.g. an inactive
   * host being edited). */
  selectedName?: string
  disabled?: boolean
  invalid?: boolean
  onChange(employeeId: string, employeeName: string): void
  onBlur?(): void
}

/**
 * Type-to-search selector for the visit's related personnel. Only an employee
 * picked from the list is accepted — there is no free-text value — so a mistyped
 * name can never be saved. Search is Turkish-aware and scoped to the chosen host
 * company and facility, matching what the backend will accept as a host.
 */
export const HostEmployeeCombobox = forwardRef<HTMLInputElement, HostEmployeeComboboxProps>(function HostEmployeeCombobox(
  { id, name, employees, companyId, facilityId, value, selectedName, disabled, invalid, onChange, onBlur },
  ref,
) {
  const generatedId = useId()
  const baseId = id ?? generatedId
  const listboxId = `${baseId}-listbox`
  const optionId = (employeeId: string) => `${baseId}-option-${employeeId}`

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const activeOptionRef = useRef<HTMLDivElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  // The results panel is rendered into the surrounding dialog (or the body) and
  // absolutely positioned over the form, so opening it never reflows the fields
  // below. It tracks the field on scroll/resize while open.
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | null>(null)
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null)

  const results = useMemo(
    () => filterHostEmployees(employees, { companyId, facilityId, query }),
    [employees, companyId, facilityId, query],
  )
  const shown = results.slice(0, RESULT_LIMIT)
  const overflowCount = results.length - shown.length

  const selectedLabel = useMemo(() => {
    if (!value) return ""
    return employees.find((employee) => employee.id === value)?.name ?? selectedName ?? ""
  }, [employees, value, selectedName])

  useEffect(() => {
    if (open) activeOptionRef.current?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, open])

  useIsomorphicLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null)
      return
    }
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const host = wrapper.closest<HTMLElement>('[role="dialog"]') ?? document.body
    setPortalHost(host)
    const reposition = () => {
      const node = wrapperRef.current
      if (!node) return
      const anchor = node.getBoundingClientRect()
      const frame = host.getBoundingClientRect()
      setPanelStyle({
        position: "absolute",
        top: anchor.bottom - frame.top,
        left: anchor.left - frame.left,
        width: anchor.width,
      })
    }
    reposition()
    window.addEventListener("resize", reposition)
    // Capture phase so scrolling any ancestor (the dialog's own scroll area) is caught.
    document.addEventListener("scroll", reposition, true)
    return () => {
      window.removeEventListener("resize", reposition)
      document.removeEventListener("scroll", reposition, true)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    setQuery("")
    setActiveIndex(0)
  }

  const commit = (employee: EmployeeOption) => {
    onChange(employee.id, employee.name)
    close()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
    if (event.key === "ArrowDown") {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setActiveIndex((index) => Math.min(index + 1, shown.length - 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      if (!open) return
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === "Enter") {
      if (open && shown[activeIndex]) {
        event.preventDefault()
        commit(shown[activeIndex])
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault()
        close()
      }
    }
  }

  const panel = (
    <div
      id={listboxId}
      role="listbox"
      aria-label="İlgili personel sonuçları"
      style={panelStyle ?? undefined}
      className="z-50 max-h-56 overflow-y-auto rounded-md border border-input bg-card py-1 text-sm shadow-md scrollbar-thin"
      // Keep clicks inside the panel (scrollbar, padding) from blurring the input.
      onMouseDown={(event) => event.preventDefault()}
    >
      {shown.length === 0 ? (
        <p className="px-3 py-2 text-slate-500">Sonuç bulunamadı</p>
      ) : (
        <>
          {shown.map((employee, index) => (
            <div
              key={employee.id}
              ref={index === activeIndex ? activeOptionRef : undefined}
              id={optionId(employee.id)}
              role="option"
              aria-selected={employee.id === value}
              title={employee.name}
              className={cn(
                "cursor-pointer truncate px-3 py-1.5",
                index === activeIndex ? "bg-slate-100 text-slate-900" : "text-slate-700",
              )}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => commit(employee)}
            >
              {employee.name}
            </div>
          ))}
          {overflowCount > 0 && (
            <p className="px-3 py-1.5 text-[11px] text-slate-500">
              +{overflowCount} kişi daha — aramayı daraltın
            </p>
          )}
        </>
      )}
    </div>
  )

  return (
    <div ref={wrapperRef}>
      <Input
        ref={ref}
        id={baseId}
        name={name}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && shown[activeIndex] ? optionId(shown[activeIndex].id) : undefined}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        placeholder="Personel arayın"
        value={open ? query : selectedLabel}
        onChange={(event) => {
          setQuery(event.target.value)
          setActiveIndex(0)
          if (!open) setOpen(true)
        }}
        onFocus={() => {
          if (disabled) return
          setOpen(true)
          setQuery("")
          setActiveIndex(0)
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          close()
          onBlur?.()
        }}
      />

      {open && !disabled && portalHost && panelStyle ? createPortal(panel, portalHost) : null}
    </div>
  )
})

import { Building2, ChevronDown, ChevronRight, DoorOpen, FolderTree, UsersRound, Warehouse } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"

import { ActiveStatusPill } from "@/components/common/ActiveStatusPill"
import type { OrganizationEntity, OrganizationKind, OrganizationSnapshot } from "@/domain/organization"
import { useAdmin } from "@/features/admin/admin-context"
import {
  entityNodeKey,
  findSelectedOrganizationEntity,
  getDefaultOrganizationNavigation,
  getExpansionKeysForSelection,
  getOrganizationTreeKeyboardAction,
  getVisibleOrganizationTreeItems,
  type OrganizationSelection,
  type VisibleOrganizationTreeItem,
} from "@/features/admin/organization-tree"
import { cn } from "@/lib/utils"

const entityIcons: Record<OrganizationKind, typeof Building2> = { COMPANY: Building2, FACILITY: Warehouse, DEPARTMENT: UsersRound, SECURITY_GATE: DoorOpen }
const entityLabels: Record<OrganizationKind, string> = { COMPANY: "Şirket", FACILITY: "Tesis", DEPARTMENT: "Departman", SECURITY_GATE: "Güvenlik kapısı" }

export function OrganizationPage() {
  const { organization } = useAdmin()
  const [selection, setSelection] = useState<OrganizationSelection | null>(null)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set())
  const [focusKey, setFocusKey] = useState("")

  useEffect(() => {
    if (!organization || selection) return
    const initial = getDefaultOrganizationNavigation(organization)
    setSelection(initial.selection)
    setExpandedKeys(initial.expandedKeys)
    setFocusKey(initial.focusKey)
  }, [organization, selection])

  const selectEntity = useCallback((next: OrganizationSelection) => {
    if (!organization) return
    setSelection(next)
    setFocusKey(entityNodeKey(next))
    setExpandedKeys((current) => new Set([...current, ...getExpansionKeysForSelection(organization, next)]))
  }, [organization])

  if (!organization) return <OrganizationLoadingState />
  const effectiveSelection = findSelectedOrganizationEntity(organization, selection) ? selection : getDefaultOrganizationNavigation(organization).selection

  return (
    <div className="-mb-2.5 -mt-2.5 flex h-[111.112dvh] min-w-0 flex-col pb-[14px] pt-[11px] md:-mb-3 md:-mt-3">
      <section className="grid min-h-0 flex-1 grid-rows-[minmax(220px,38vh)_minmax(0,1fr)] overflow-hidden rounded-lg border bg-card shadow-panel lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-1" aria-label="Organizasyon çalışma alanı">
        <OrganizationHierarchy organization={organization} selection={effectiveSelection} expandedKeys={expandedKeys} focusKey={focusKey} onExpandedKeysChange={setExpandedKeys} onFocusKeyChange={setFocusKey} onSelect={selectEntity} />
        <OrganizationWorkspace organization={organization} selection={effectiveSelection} onSelect={selectEntity} />
      </section>
    </div>
  )
}

export function OrganizationHierarchy({ organization, selection, expandedKeys, focusKey, onExpandedKeysChange, onFocusKeyChange, onSelect }: {
  organization: OrganizationSnapshot
  selection: OrganizationSelection | null
  expandedKeys: Set<string>
  focusKey: string
  onExpandedKeysChange(next: Set<string>): void
  onFocusKeyChange(key: string): void
  onSelect(selection: OrganizationSelection): void
}) {
  const items = useMemo(() => getVisibleOrganizationTreeItems(organization, expandedKeys), [expandedKeys, organization])
  const itemRefs = useRef(new Map<string, HTMLDivElement>())
  const activeFocusKey = items.some((item) => item.key === focusKey) ? focusKey : items[0]?.key ?? ""

  const updateExpansion = (key: string, expanded?: boolean) => {
    const next = new Set(expandedKeys)
    if (expanded ?? !next.has(key)) next.add(key)
    else next.delete(key)
    onExpandedKeysChange(next)
  }
  const focusItem = (key: string) => {
    onFocusKeyChange(key)
    window.requestAnimationFrame(() => itemRefs.current.get(key)?.focus())
  }
  const activate = (item: VisibleOrganizationTreeItem) => {
    if (item.nodeType === "GROUP") updateExpansion(item.key)
    else if (item.entityKind && item.entity) onSelect({ kind: item.entityKind, id: item.entity.id })
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, item: VisibleOrganizationTreeItem) => {
    const action = getOrganizationTreeKeyboardAction(event.key, item.key, items, expandedKeys)
    if (action.type === "NONE") return
    event.preventDefault()
    if (action.type === "FOCUS") focusItem(action.key)
    else if (action.type === "EXPAND") updateExpansion(action.key, true)
    else if (action.type === "COLLAPSE") updateExpansion(action.key, false)
    else activate(item)
  }

  return (
    <aside className="flex min-h-0 min-w-0 flex-col border-b bg-slate-50/60 lg:border-b-0 lg:border-r" aria-label="Organizasyon hiyerarşisi paneli">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3"><FolderTree className="size-4 text-slate-500" /><h1 className="text-sm font-semibold text-slate-900">Organizasyon</h1><span className="ml-auto text-[11px] tabular-nums text-slate-500">{organization.companies.length} şirket</span></div>
      <div role="tree" aria-label="Organizasyon hiyerarşisi" className="min-h-0 flex-1 overflow-y-auto p-2">
        {items.map((item) => {
          const isExpanded = item.expandable && expandedKeys.has(item.key)
          const isSelected = item.nodeType === "ENTITY" && selection?.kind === item.entityKind && selection?.id === item.entity?.id
          const Icon = item.nodeType === "GROUP" ? FolderTree : entityIcons[item.entityKind!]
          return (
            <div
              key={item.key}
              ref={(element) => { if (element) itemRefs.current.set(item.key, element); else itemRefs.current.delete(item.key) }}
              id={`organization-tree-${item.key.replaceAll(":", "-")}`}
              role="treeitem"
              aria-level={item.depth}
              {...(item.expandable ? { "aria-expanded": isExpanded } : {})}
              {...(item.nodeType === "ENTITY" ? { "aria-selected": isSelected } : {})}
              tabIndex={item.key === activeFocusKey ? 0 : -1}
              onFocus={() => onFocusKeyChange(item.key)}
              onKeyDown={(event) => handleKeyDown(event, item)}
              onClick={() => activate(item)}
              className={cn("group flex h-9 cursor-pointer select-none items-center gap-1.5 rounded-md border border-transparent pr-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1", isSelected ? "border-blue-200 bg-blue-50 font-semibold text-blue-800" : item.nodeType === "GROUP" ? "font-medium text-slate-600 hover:bg-white" : "font-medium text-slate-700 hover:bg-white", item.entity && !item.entity.active && "text-slate-500")}
              style={{ paddingLeft: 6 + (item.depth - 1) * 14 }}
            >
              {item.expandable ? <button type="button" tabIndex={-1} aria-label={`${item.label} ${isExpanded ? "daralt" : "genişlet"}`} className="flex size-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700" onClick={(event) => { event.stopPropagation(); updateExpansion(item.key) }}>{isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}</button> : <span className="size-5 shrink-0" aria-hidden="true" />}
              <Icon className={cn("size-3.5 shrink-0", isSelected ? "text-blue-600" : "text-slate-400")} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.entity && !item.entity.active && <span className="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">Pasif</span>}
              {item.nodeType === "GROUP" && <span className="shrink-0 text-[10px] tabular-nums text-slate-400">{getGroupCount(organization, item)}</span>}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

export function OrganizationWorkspace({ organization, selection, onSelect }: { organization: OrganizationSnapshot; selection: OrganizationSelection | null; onSelect(selection: OrganizationSelection): void }) {
  const entity = findSelectedOrganizationEntity(organization, selection)
  if (!selection || !entity) return <div className="flex min-h-0 items-center justify-center p-6 text-sm text-slate-500">Görüntülenecek organizasyon kaydı bulunmuyor.</div>

  const parentCompany = selection.kind === "FACILITY" || selection.kind === "DEPARTMENT"
    ? organization.companies.find((item) => item.id === entity.parentId)
    : selection.kind === "SECURITY_GATE"
      ? organization.companies.find((company) => company.id === organization.facilities.find((facility) => facility.id === entity.parentId)?.parentId)
      : undefined
  const parentFacility = selection.kind === "SECURITY_GATE" ? organization.facilities.find((item) => item.id === entity.parentId) : undefined
  const Icon = entityIcons[selection.kind]
  const contextPath = selection.kind === "COMPANY" ? entityLabels[selection.kind] : selection.kind === "SECURITY_GATE" ? `${parentCompany?.name ?? "—"} / ${parentFacility?.name ?? "—"}` : `${parentCompany?.name ?? "—"} / ${entityLabels[selection.kind]}`

  return (
    <div className="flex min-h-0 min-w-0 flex-col bg-white" aria-label="Organizasyon detayları">
      <header className="flex min-h-20 shrink-0 items-center gap-3 border-b px-4 py-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-slate-50 text-slate-600"><Icon className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{contextPath}</p><h2 className="mt-0.5 truncate text-base font-semibold text-slate-950">{entity.name}</h2></div><ActiveStatusPill active={entity.active} /></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {selection.kind === "COMPANY" && <CompanyWorkspace organization={organization} company={entity} onSelect={onSelect} />}
        {selection.kind === "FACILITY" && <FacilityWorkspace organization={organization} facility={entity} parentCompany={parentCompany} onSelect={onSelect} />}
        {selection.kind === "DEPARTMENT" && <DetailGrid rows={[{ label: "Departman adı", value: entity.name }, { label: "Bağlı şirket", value: parentCompany?.name ?? "—" }, { label: "Durum", value: entity.active ? "Aktif" : "Pasif" }]} />}
        {selection.kind === "SECURITY_GATE" && <DetailGrid rows={[{ label: "Kapı adı", value: entity.name }, { label: "Bağlı tesis", value: parentFacility?.name ?? "—" }, { label: "Bağlı şirket", value: parentCompany?.name ?? "—" }, { label: "Durum", value: entity.active ? "Aktif" : "Pasif" }]} />}
      </div>
    </div>
  )
}

function CompanyWorkspace({ organization, company, onSelect }: { organization: OrganizationSnapshot; company: OrganizationEntity; onSelect(selection: OrganizationSelection): void }) {
  const facilities = organization.facilities.filter((item) => item.parentId === company.id)
  const departments = organization.departments.filter((item) => item.parentId === company.id)
  return <div className="grid items-start gap-3 xl:grid-cols-2"><ChildList title="Tesisler" items={facilities} emptyMessage="Bu şirkete bağlı tesis bulunmuyor." onSelect={(id) => onSelect({ kind: "FACILITY", id })} /><ChildList title="Departmanlar" items={departments} emptyMessage="Bu şirkete bağlı departman bulunmuyor." onSelect={(id) => onSelect({ kind: "DEPARTMENT", id })} /></div>
}

function FacilityWorkspace({ organization, facility, parentCompany, onSelect }: { organization: OrganizationSnapshot; facility: OrganizationEntity; parentCompany?: OrganizationEntity; onSelect(selection: OrganizationSelection): void }) {
  const gates = organization.securityGates.filter((item) => item.parentId === facility.id)
  return <div className="grid gap-3"><DetailGrid rows={[{ label: "Tesis adı", value: facility.name }, { label: "Bağlı şirket", value: parentCompany?.name ?? "—" }, { label: "Durum", value: facility.active ? "Aktif" : "Pasif" }]} /><ChildList title="Güvenlik kapıları" items={gates} emptyMessage="Bu tesise bağlı güvenlik kapısı bulunmuyor." onSelect={(id) => onSelect({ kind: "SECURITY_GATE", id })} /></div>
}

function ChildList({ title, items, emptyMessage, onSelect }: { title: string; items: OrganizationEntity[]; emptyMessage: string; onSelect(id: string): void }) {
  return <section className="overflow-hidden rounded-md border bg-white" aria-label={title}><div className="flex h-9 items-center border-b bg-slate-50 px-3"><h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">{title}</h3><span className="ml-1.5 text-[10px] tabular-nums text-slate-400">· {items.length}</span></div>{items.length === 0 ? <p className="px-3 py-5 text-xs text-slate-500">{emptyMessage}</p> : <div className="divide-y">{items.map((item) => <button key={item.id} type="button" className="flex h-10 w-full items-center gap-3 px-3 text-left text-xs outline-none transition-colors hover:bg-slate-50 focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500" onClick={() => onSelect(item.id)}><span className={cn("min-w-0 flex-1 truncate font-medium", item.active ? "text-slate-800" : "text-slate-500")}>{item.name}</span><ActiveStatusPill active={item.active} /></button>)}</div>}</section>
}

function DetailGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return <dl className="grid max-w-2xl overflow-hidden rounded-md border sm:grid-cols-2">{rows.map((row) => <div key={row.label} className="border-b px-3 py-3 last:border-b-0 sm:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-child(even)]:border-r-0"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{row.label}</dt><dd className="mt-1 text-xs font-medium text-slate-900">{row.value}</dd></div>)}</dl>
}

function getGroupCount(organization: OrganizationSnapshot, item: VisibleOrganizationTreeItem) {
  const companyId = item.key.split(":")[1]
  return item.groupKind === "FACILITIES" ? organization.facilities.filter((entity) => entity.parentId === companyId).length : organization.departments.filter((entity) => entity.parentId === companyId).length
}

function OrganizationLoadingState() {
  return <div className="-mb-2.5 -mt-2.5 h-[111.112dvh] pb-[14px] pt-[11px] md:-mb-3 md:-mt-3"><div className="h-full animate-pulse rounded-lg border bg-slate-100" aria-label="Organizasyon yükleniyor" role="status" /></div>
}

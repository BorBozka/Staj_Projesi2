import { Building2, ChevronDown, ChevronRight, DoorOpen, FolderTree, Pencil, Plus, UsersRound, Warehouse } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react"

import { ActiveStatusPill } from "@/components/common/ActiveStatusPill"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { OrganizationEntity, OrganizationKind, OrganizationSnapshot } from "@/domain/organization"
import { useAdmin } from "@/features/admin/admin-context"
import {
  entityNodeKey,
  findSelectedOrganizationEntity,
  getDefaultOrganizationNavigation,
  getExpansionKeysForSelection,
  getExpansionKeysForNewEntity,
  getOrganizationTreeKeyboardAction,
  getVisibleOrganizationTreeItems,
  type OrganizationSelection,
  type VisibleOrganizationTreeItem,
} from "@/features/admin/organization-tree"
import {
  buildOrganizationSaveInput,
  getInitialOrganizationDraft,
  getOrganizationContextLabel,
  getOrganizationNameError,
  isOrganizationDraftDirty,
  viewOrganizationWorkspace,
  type OrganizationDraft,
  type OrganizationWorkspaceMode,
} from "@/features/admin/organization-workspace"
import { cn } from "@/lib/utils"

const entityIcons: Record<OrganizationKind, typeof Building2> = { COMPANY: Building2, FACILITY: Warehouse, DEPARTMENT: UsersRound, SECURITY_GATE: DoorOpen }
const entityLabels: Record<OrganizationKind, string> = { COMPANY: "Şirket", FACILITY: "Tesis", DEPARTMENT: "Departman", SECURITY_GATE: "Güvenlik kapısı" }
const entityNameLabels: Record<OrganizationKind, string> = { COMPANY: "Şirket adı", FACILITY: "Tesis adı", DEPARTMENT: "Departman adı", SECURITY_GATE: "Kapı adı" }

export function OrganizationPage() {
  const { organization, saveOrganizationEntity } = useAdmin()
  const [selection, setSelection] = useState<OrganizationSelection | null>(null)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set())
  const [focusKey, setFocusKey] = useState("")
  const [workspaceMode, setWorkspaceMode] = useState<OrganizationWorkspaceMode>(viewOrganizationWorkspace)
  const [formDirty, setFormDirty] = useState(false)

  useEffect(() => {
    if (!organization || selection) return
    const initial = getDefaultOrganizationNavigation(organization)
    setSelection(initial.selection)
    setExpandedKeys(initial.expandedKeys)
    setFocusKey(initial.focusKey)
  }, [organization, selection])

  const applySelection = useCallback((next: OrganizationSelection) => {
    if (!organization) return
    setSelection(next)
    setFocusKey(entityNodeKey(next))
    setExpandedKeys((current) => new Set([...current, ...getExpansionKeysForSelection(organization, next)]))
  }, [organization])

  const confirmDiscard = useCallback(() => {
    if (workspaceMode.type === "view" || !formDirty) return true
    return window.confirm("Kaydedilmemiş değişiklikler silinecek. Devam etmek istiyor musunuz?")
  }, [formDirty, workspaceMode.type])

  const selectEntity = useCallback((next: OrganizationSelection) => {
    if (!confirmDiscard()) return
    setWorkspaceMode(viewOrganizationWorkspace())
    setFormDirty(false)
    applySelection(next)
  }, [applySelection, confirmDiscard])

  const beginCreate = useCallback((kind: OrganizationKind, parentId: string | undefined, returnSelection: OrganizationSelection | null) => {
    if (!confirmDiscard()) return
    setFormDirty(false)
    setWorkspaceMode({ type: "create", kind, parentId, returnSelection })
  }, [confirmDiscard])

  const beginEdit = useCallback((currentSelection: OrganizationSelection) => {
    setFormDirty(false)
    setWorkspaceMode({ type: "edit", selection: currentSelection })
  }, [])

  if (!organization) return <OrganizationLoadingState />
  const effectiveSelection = findSelectedOrganizationEntity(organization, selection) ? selection : getDefaultOrganizationNavigation(organization).selection

  const cancelForm = () => {
    if (workspaceMode.type === "create" && workspaceMode.returnSelection) applySelection(workspaceMode.returnSelection)
    setWorkspaceMode(viewOrganizationWorkspace())
    setFormDirty(false)
  }

  const saveForm = async (kind: OrganizationKind, input: Omit<OrganizationEntity, "id"> & { id?: string }) => {
    const saved = await saveOrganizationEntity(kind, input)
    const nextSelection = { kind, id: saved.id } satisfies OrganizationSelection
    setSelection(nextSelection)
    setFocusKey(entityNodeKey(nextSelection))
    setExpandedKeys((current) => new Set([...current, ...getExpansionKeysForNewEntity(organization, kind, saved.parentId)]))
    setWorkspaceMode(viewOrganizationWorkspace())
    setFormDirty(false)
  }

  return (
    <div className="-mb-2.5 -mt-2.5 flex h-[111.112dvh] min-w-0 flex-col pb-[14px] pt-[11px] md:-mb-3 md:-mt-3">
      <section className="grid min-h-0 flex-1 grid-rows-[minmax(220px,38vh)_minmax(0,1fr)] overflow-hidden rounded-lg border bg-card shadow-panel lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-1" aria-label="Organizasyon çalışma alanı">
        <OrganizationHierarchy organization={organization} selection={effectiveSelection} expandedKeys={expandedKeys} focusKey={focusKey} onExpandedKeysChange={setExpandedKeys} onFocusKeyChange={setFocusKey} onSelect={selectEntity} onCreateCompany={() => beginCreate("COMPANY", undefined, effectiveSelection)} />
        <OrganizationWorkspace organization={organization} selection={effectiveSelection} mode={workspaceMode} onSelect={selectEntity} onEdit={beginEdit} onCreate={beginCreate} onDirtyChange={setFormDirty} onSave={saveForm} onCancel={cancelForm} />
      </section>
    </div>
  )
}

export function OrganizationHierarchy({ organization, selection, expandedKeys, focusKey, onExpandedKeysChange, onFocusKeyChange, onSelect, onCreateCompany }: {
  organization: OrganizationSnapshot
  selection: OrganizationSelection | null
  expandedKeys: Set<string>
  focusKey: string
  onExpandedKeysChange(next: Set<string>): void
  onFocusKeyChange(key: string): void
  onSelect(selection: OrganizationSelection): void
  onCreateCompany(): void
}) {
  const items = useMemo(() => getVisibleOrganizationTreeItems(organization, expandedKeys), [expandedKeys, organization])
  const itemRefs = useRef(new Map<string, HTMLDivElement>())
  const activeFocusKey = items.some((item) => item.key === focusKey) ? focusKey : items[0]?.key ?? ""
  const selectedKey = selection ? entityNodeKey(selection) : ""

  useEffect(() => {
    if (!selectedKey) return
    const frame = window.requestAnimationFrame(() => itemRefs.current.get(selectedKey)?.scrollIntoView({ block: "nearest" }))
    return () => window.cancelAnimationFrame(frame)
  }, [items, selectedKey])

  const updateExpansion = (key: string, expanded?: boolean) => {
    const next = new Set(expandedKeys)
    if (expanded ?? !next.has(key)) next.add(key)
    else next.delete(key)
    onExpandedKeysChange(next)
  }
  const focusItem = (key: string) => {
    onFocusKeyChange(key)
    window.requestAnimationFrame(() => {
      const element = itemRefs.current.get(key)
      element?.focus()
      element?.scrollIntoView({ block: "nearest" })
    })
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
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <FolderTree className="size-4 text-slate-500" />
        <h1 className="text-sm font-semibold text-slate-900">Organizasyon</h1>
        <span className="ml-auto text-[11px] tabular-nums text-slate-500">{organization.companies.length} şirket</span>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={onCreateCompany}>+ Şirket</Button>
      </div>
      <div role="tree" aria-label="Organizasyon hiyerarşisi" className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-thin">
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

export function OrganizationWorkspace({ organization, selection, mode, onSelect, onEdit, onCreate, onDirtyChange, onSave, onCancel }: {
  organization: OrganizationSnapshot
  selection: OrganizationSelection | null
  mode: OrganizationWorkspaceMode
  onSelect(selection: OrganizationSelection): void
  onEdit(selection: OrganizationSelection): void
  onCreate(kind: OrganizationKind, parentId: string | undefined, returnSelection: OrganizationSelection | null): void
  onDirtyChange(dirty: boolean): void
  onSave(kind: OrganizationKind, input: Omit<OrganizationEntity, "id"> & { id?: string }): Promise<void>
  onCancel(): void
}) {
  const entity = findSelectedOrganizationEntity(organization, selection)
  if (!selection || !entity) return <div className="flex min-h-0 items-center justify-center p-6 text-sm text-slate-500">Görüntülenecek organizasyon kaydı bulunmuyor.</div>

  if (mode.type !== "view") {
    const formKind = mode.type === "edit" ? mode.selection.kind : mode.kind
    const formEntity = mode.type === "edit" ? findSelectedOrganizationEntity(organization, mode.selection) : null
    const heading = mode.type === "edit" ? formEntity?.name ?? entity.name : `Yeni ${entityLabels[formKind].toLocaleLowerCase("tr-TR")}`
    const context = mode.type === "edit" ? getOrganizationContextLabel(organization, mode.selection) : getCreateContextLabel(organization, mode)
    const Icon = entityIcons[formKind]
    const formKey = mode.type === "edit" ? `edit:${mode.selection.kind}:${mode.selection.id}` : `create:${mode.kind}:${mode.parentId ?? "root"}`
    return (
      <div className="flex min-h-0 min-w-0 flex-col bg-white" aria-label="Organizasyon yönetim formu">
        <WorkspaceHeader icon={Icon} context={context} heading={heading} />
        <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin">
          <OrganizationForm key={formKey} organization={organization} mode={mode} entity={formEntity} onDirtyChange={onDirtyChange} onSave={onSave} onCancel={onCancel} />
        </div>
      </div>
    )
  }

  const Icon = entityIcons[selection.kind]
  return (
    <div className="flex min-h-0 min-w-0 flex-col bg-white" aria-label="Organizasyon detayları">
      <WorkspaceHeader icon={Icon} context={getOrganizationContextLabel(organization, selection)} heading={entity.name} status={entity.active} action={<Button type="button" size="sm" variant="outline" onClick={() => onEdit(selection)}><Pencil />Düzenle</Button>} />
      <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin sm:p-4">
        {selection.kind === "COMPANY" && <CompanyWorkspace organization={organization} company={entity} selection={selection} onSelect={onSelect} onCreate={onCreate} />}
        {selection.kind === "FACILITY" && <FacilityWorkspace organization={organization} facility={entity} selection={selection} onSelect={onSelect} onCreate={onCreate} />}
        {selection.kind === "DEPARTMENT" && <DepartmentWorkspace organization={organization} department={entity} />}
        {selection.kind === "SECURITY_GATE" && <SecurityGateWorkspace organization={organization} gate={entity} />}
      </div>
    </div>
  )
}

function WorkspaceHeader({ icon: Icon, context, heading, status, action }: { icon: typeof Building2; context: string; heading: string; status?: boolean; action?: ReactNode }) {
  return <header className="flex min-h-20 shrink-0 items-center gap-3 border-b px-4 py-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-slate-50 text-slate-600"><Icon className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{context}</p><h2 className="mt-0.5 truncate text-base font-semibold text-slate-950">{heading}</h2></div>{status !== undefined && <ActiveStatusPill active={status} />}{action}</header>
}

function OrganizationForm({ organization, mode, entity, onDirtyChange, onSave, onCancel }: {
  organization: OrganizationSnapshot
  mode: Exclude<OrganizationWorkspaceMode, { type: "view" }>
  entity: OrganizationEntity | null
  onDirtyChange(dirty: boolean): void
  onSave(kind: OrganizationKind, input: Omit<OrganizationEntity, "id"> & { id?: string }): Promise<void>
  onCancel(): void
}) {
  const kind = mode.type === "edit" ? mode.selection.kind : mode.kind
  const initial = useMemo(() => getInitialOrganizationDraft(mode, entity), [entity, mode])
  const [draft, setDraft] = useState<OrganizationDraft>(initial)
  const [nameTouched, setNameTouched] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [serviceError, setServiceError] = useState("")
  const [saving, setSaving] = useState(false)
  const dirty = isOrganizationDraftDirty(draft, initial)
  const nameError = getOrganizationNameError(draft.name)

  useEffect(() => { onDirtyChange(dirty) }, [dirty, onDirtyChange])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitAttempted(true)
    setServiceError("")
    if (nameError) return
    setSaving(true)
    try {
      await onSave(kind, buildOrganizationSaveInput(mode, draft, entity))
    } catch (error) {
      setServiceError(error instanceof Error ? error.message : "Organizasyon kaydı kaydedilemedi.")
    } finally {
      setSaving(false)
    }
  }

  const parentContext = getFormParentContext(organization, kind, mode, entity)
  const saveDisabled = saving || Boolean(nameError) || (mode.type === "edit" && !dirty)

  return (
    <form className="max-w-xl rounded-md border bg-white" noValidate onSubmit={submit} aria-label={`${entityLabels[kind]} ${mode.type === "edit" ? "düzenleme" : "oluşturma"} formu`}>
      <div className="space-y-4 p-4">
        {serviceError && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{serviceError}</div>}
        <div className="space-y-1.5">
          <Label htmlFor="organization-name">{entityNameLabels[kind]}</Label>
          <Input id="organization-name" autoFocus value={draft.name} onChange={(event) => { setDraft((current) => ({ ...current, name: event.target.value })); setServiceError("") }} onBlur={() => setNameTouched(true)} aria-invalid={Boolean(nameError && (nameTouched || submitAttempted))} aria-describedby={nameError && (nameTouched || submitAttempted) ? "organization-name-error" : undefined} />
          {nameError && (nameTouched || submitAttempted) && <p id="organization-name-error" role="alert" className="text-xs font-medium text-red-600">{nameError}</p>}
        </div>
        {parentContext.map((row) => <div key={row.label} className="space-y-1.5"><Label htmlFor={row.id}>{row.label}</Label><Input id={row.id} value={row.value} readOnly aria-readonly="true" /></div>)}
        <div className="flex items-center justify-between rounded-md border bg-slate-50 px-3 py-2.5">
          <Label htmlFor="organization-active" className="cursor-pointer">Aktif</Label>
          <Switch id="organization-active" checked={draft.active} onCheckedChange={(active) => { setDraft((current) => ({ ...current, active })); setServiceError("") }} aria-label="Aktif" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t bg-slate-50/70 px-4 py-3">
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>İptal</Button>
        <Button type="submit" size="sm" disabled={saveDisabled}>{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
      </div>
    </form>
  )
}

function CompanyWorkspace({ organization, company, selection, onSelect, onCreate }: { organization: OrganizationSnapshot; company: OrganizationEntity; selection: OrganizationSelection; onSelect(selection: OrganizationSelection): void; onCreate(kind: OrganizationKind, parentId: string | undefined, returnSelection: OrganizationSelection): void }) {
  const facilities = organization.facilities.filter((item) => item.parentId === company.id)
  const departments = organization.departments.filter((item) => item.parentId === company.id)
  return <div className="grid items-start gap-3 xl:grid-cols-2"><ChildList title="Tesisler" actionLabel="Tesis ekle" items={facilities} emptyMessage="Bu şirkete bağlı tesis bulunmuyor." onAction={() => onCreate("FACILITY", company.id, selection)} onSelect={(id) => onSelect({ kind: "FACILITY", id })} /><ChildList title="Departmanlar" actionLabel="Departman ekle" items={departments} emptyMessage="Bu şirkete bağlı departman bulunmuyor." onAction={() => onCreate("DEPARTMENT", company.id, selection)} onSelect={(id) => onSelect({ kind: "DEPARTMENT", id })} /></div>
}

function FacilityWorkspace({ organization, facility, selection, onSelect, onCreate }: { organization: OrganizationSnapshot; facility: OrganizationEntity; selection: OrganizationSelection; onSelect(selection: OrganizationSelection): void; onCreate(kind: OrganizationKind, parentId: string | undefined, returnSelection: OrganizationSelection): void }) {
  const parentCompany = organization.companies.find((item) => item.id === facility.parentId)
  const gates = organization.securityGates.filter((item) => item.parentId === facility.id)
  return <div className="grid gap-3"><DetailGrid rows={[{ label: "Tesis adı", value: facility.name }, { label: "Bağlı şirket", value: parentCompany?.name ?? "—" }]} /><ChildList title="Güvenlik kapıları" actionLabel="Güvenlik kapısı ekle" items={gates} emptyMessage="Bu tesise bağlı güvenlik kapısı bulunmuyor." onAction={() => onCreate("SECURITY_GATE", facility.id, selection)} onSelect={(id) => onSelect({ kind: "SECURITY_GATE", id })} /></div>
}

function DepartmentWorkspace({ organization, department }: { organization: OrganizationSnapshot; department: OrganizationEntity }) {
  const parentCompany = organization.companies.find((item) => item.id === department.parentId)
  return <DetailGrid rows={[{ label: "Departman adı", value: department.name }, { label: "Bağlı şirket", value: parentCompany?.name ?? "—" }]} />
}

function SecurityGateWorkspace({ organization, gate }: { organization: OrganizationSnapshot; gate: OrganizationEntity }) {
  const parentFacility = organization.facilities.find((item) => item.id === gate.parentId)
  const parentCompany = organization.companies.find((item) => item.id === parentFacility?.parentId)
  return <DetailGrid rows={[{ label: "Kapı adı", value: gate.name }, { label: "Bağlı tesis", value: parentFacility?.name ?? "—" }, { label: "Bağlı şirket", value: parentCompany?.name ?? "—" }]} />
}

function ChildList({ title, actionLabel, items, emptyMessage, onAction, onSelect }: { title: string; actionLabel: string; items: OrganizationEntity[]; emptyMessage: string; onAction(): void; onSelect(id: string): void }) {
  return <section className="overflow-hidden rounded-md border bg-white" aria-label={title}><div className="flex h-9 items-center border-b bg-slate-50 px-3"><h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">{title}</h3><span className="ml-1.5 text-[10px] tabular-nums text-slate-400">· {items.length}</span><Button type="button" size="sm" variant="ghost" className="ml-auto h-7 px-2 text-[11px] text-blue-700" onClick={onAction}><Plus className="size-3" />{actionLabel}</Button></div>{items.length === 0 ? <p className="px-3 py-5 text-xs text-slate-500">{emptyMessage}</p> : <div className="divide-y">{items.map((item) => <button key={item.id} type="button" className="flex h-10 w-full items-center gap-3 px-3 text-left text-xs outline-none transition-colors hover:bg-slate-50 focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500" onClick={() => onSelect(item.id)}><span className={cn("min-w-0 flex-1 truncate font-medium", item.active ? "text-slate-800" : "text-slate-500")}>{item.name}</span><ActiveStatusPill active={item.active} /></button>)}</div>}</section>
}

function DetailGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return <dl className="grid max-w-2xl overflow-hidden rounded-md border sm:grid-cols-2">{rows.map((row) => <div key={row.label} className="border-b px-3 py-3 last:border-b-0 sm:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-child(even)]:border-r-0"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{row.label}</dt><dd className="mt-1 text-xs font-medium text-slate-900">{row.value}</dd></div>)}</dl>
}

function getCreateContextLabel(organization: OrganizationSnapshot, mode: Extract<OrganizationWorkspaceMode, { type: "create" }>) {
  if (mode.kind === "COMPANY") return "YENİ ŞİRKET"
  if (mode.kind === "FACILITY" || mode.kind === "DEPARTMENT") {
    const company = organization.companies.find((item) => item.id === mode.parentId)
    return `YENİ ${entityLabels[mode.kind].toLocaleUpperCase("tr-TR")} · ${company?.name ?? "—"}`
  }
  const facility = organization.facilities.find((item) => item.id === mode.parentId)
  const company = organization.companies.find((item) => item.id === facility?.parentId)
  return `YENİ GÜVENLİK KAPISI · ${company?.name ?? "—"} / ${facility?.name ?? "—"}`
}

function getFormParentContext(organization: OrganizationSnapshot, kind: OrganizationKind, mode: Exclude<OrganizationWorkspaceMode, { type: "view" }>, entity: OrganizationEntity | null) {
  const parentId = mode.type === "edit" ? entity?.parentId : mode.parentId
  if (kind === "COMPANY") return []
  if (kind === "FACILITY" || kind === "DEPARTMENT") {
    const company = organization.companies.find((item) => item.id === parentId)
    return [{ id: "organization-parent-company", label: "Bağlı şirket", value: company?.name ?? "—" }]
  }
  const facility = organization.facilities.find((item) => item.id === parentId)
  const company = organization.companies.find((item) => item.id === facility?.parentId)
  return [
    { id: "organization-parent-facility", label: "Bağlı tesis", value: facility?.name ?? "—" },
    { id: "organization-parent-company", label: "Bağlı şirket", value: company?.name ?? "—" },
  ]
}

function getGroupCount(organization: OrganizationSnapshot, item: VisibleOrganizationTreeItem) {
  const companyId = item.key.split(":")[1]
  return item.groupKind === "FACILITIES" ? organization.facilities.filter((entity) => entity.parentId === companyId).length : organization.departments.filter((entity) => entity.parentId === companyId).length
}

function OrganizationLoadingState() {
  return <div className="-mb-2.5 -mt-2.5 h-[111.112dvh] pb-[14px] pt-[11px] md:-mb-3 md:-mt-3"><div className="h-full animate-pulse rounded-lg border bg-slate-100" aria-label="Organizasyon yükleniyor" role="status" /></div>
}

import { Building2, DoorOpen, Pencil, Plus, UsersRound, Warehouse } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { OrganizationEntity, OrganizationKind } from "@/domain/admin"
import { useAdmin } from "@/features/admin/admin-context"
import { adminService } from "@/services"

const panels: { kind: OrganizationKind; label: string; icon: typeof Building2; parentLabel?: string }[] = [
  { kind: "COMPANY", label: "Şirketler", icon: Building2 }, { kind: "FACILITY", label: "Tesisler", icon: Warehouse, parentLabel: "Şirket" }, { kind: "DEPARTMENT", label: "Departmanlar", icon: UsersRound, parentLabel: "Şirket" }, { kind: "SECURITY_GATE", label: "Güvenlik kapıları", icon: DoorOpen, parentLabel: "Tesis" },
]

export function OrganizationPage() {
  const { organization, reload } = useAdmin()
  const [selectedKind, setSelectedKind] = useState<OrganizationKind>("COMPANY")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<OrganizationEntity | null>(null)
  const panel = panels.find((item) => item.kind === selectedKind)!
  const items = organization ? organization[selectedKind === "COMPANY" ? "companies" : selectedKind === "FACILITY" ? "facilities" : selectedKind === "DEPARTMENT" ? "departments" : "securityGates"] : []
  const selected = items.find((item) => item.id === selectedId) ?? null
  const parentOptions = useMemo(() => selectedKind === "FACILITY" || selectedKind === "DEPARTMENT" ? organization?.companies ?? [] : selectedKind === "SECURITY_GATE" ? organization?.facilities ?? [] : [], [organization, selectedKind])
  const setKind = (kind: OrganizationKind) => { setSelectedKind(kind); setSelectedId(null) }

  return <div className="-mt-2.5 -mb-2.5 flex min-h-[111.112dvh] min-w-0 flex-col gap-3 pt-[11px] pb-[14px] md:-mt-3 md:-mb-3"><section className="grid min-h-0 flex-1 overflow-hidden rounded-lg border bg-card shadow-panel lg:grid-cols-[240px_minmax(0,1fr)]"><aside className="border-b bg-slate-50/60 p-2 lg:border-b-0 lg:border-r"><nav aria-label="Organizasyon varlık türleri" className="grid gap-1 sm:grid-cols-2 lg:block">{panels.map((item) => { const Icon = item.icon; const count = organization?.[item.kind === "COMPANY" ? "companies" : item.kind === "FACILITY" ? "facilities" : item.kind === "DEPARTMENT" ? "departments" : "securityGates"].length ?? 0; return <button key={item.kind} type="button" onClick={() => setKind(item.kind)} className={selectedKind === item.kind ? "flex h-9 w-full items-center gap-2 rounded-md bg-blue-600 px-2.5 text-left text-xs font-semibold text-white" : "flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-xs font-medium text-slate-700 hover:bg-white"}><Icon className="size-4" />{item.label}<span className="ml-auto tabular-nums opacity-75">{count}</span></button> })}</nav></aside><div className="flex min-h-0 flex-col"><div className="flex items-center justify-between border-b px-3 py-2.5"><div><h2 className="text-sm font-semibold text-slate-900">{panel.label}</h2><p className="text-[11px] text-slate-500">Seçili türün kayıtları</p></div><Button size="sm" onClick={() => setEditing({ id: "", name: "", active: true, parentId: parentOptions[0]?.id })}><Plus />Ekle</Button></div><div className="min-h-0 flex-1 overflow-auto"><table className="w-full min-w-[580px] text-left text-xs"><thead className="sticky top-0 border-b bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Ad</th>{panel.parentLabel && <th className="px-3 py-2">{panel.parentLabel}</th>}<th className="px-3 py-2">Durum</th><th className="w-20 px-3 py-2" /></tr></thead><tbody className="divide-y border-b">{items.map((item) => <tr key={item.id} onClick={() => setSelectedId(item.id)} className={selected?.id === item.id ? "bg-blue-50/70" : "record-row-hover"}><td className="px-3 py-3 font-medium text-slate-900">{item.name}</td>{panel.parentLabel && <td className="px-3">{parentOptions.find((parent) => parent.id === item.parentId)?.name ?? "—"}</td>}<td className="px-3"><span className={item.active ? "text-emerald-700" : "text-slate-500"}>{item.active ? "Aktif" : "Pasif"}</span></td><td className="px-3 text-right"><Button variant="ghost" size="icon-sm" aria-label={`${item.name} düzenle`} onClick={(event) => { event.stopPropagation(); setEditing(item) }}><Pencil /></Button></td></tr>)}</tbody></table></div></div></section><OrganizationDialog kind={selectedKind} entity={editing} parents={parentOptions} onOpenChange={(open) => !open && setEditing(null)} onSaved={() => void reload()} /></div>
}

function OrganizationDialog({ kind, entity, parents, onOpenChange, onSaved }: { kind: OrganizationKind; entity: OrganizationEntity | null; parents: OrganizationEntity[]; onOpenChange(open: boolean): void; onSaved(): void }) {
  const [draft, setDraft] = useState<OrganizationEntity | null>(null)
  const value = draft && entity && draft.id === entity.id ? draft : entity
  const setValue = (change: Partial<OrganizationEntity>) => value && setDraft({ ...value, ...change })
  const save = async () => { if (!value || !value.name.trim()) return; await adminService.saveOrganizationEntity(kind, value); setDraft(null); onSaved(); onOpenChange(false) }
  return <Dialog open={Boolean(entity)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{entity?.id ? "Organizasyon kaydını düzenle" : "Yeni organizasyon kaydı"}</DialogTitle></DialogHeader>{value && <div className="grid gap-3"><label><span className="mb-1 block text-xs font-medium">Ad</span><Input autoFocus value={value.name} onChange={(event) => setValue({ name: event.target.value })} /></label>{parents.length > 0 && <label><span className="mb-1 block text-xs font-medium">Bağlı {kind === "SECURITY_GATE" ? "tesis" : "şirket"}</span><select className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={value.parentId ?? ""} onChange={(event) => setValue({ parentId: event.target.value })}>{parents.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select></label>}<label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={value.active} onChange={(event) => setValue({ active: event.target.checked })} />Aktif</label></div>}<DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button><Button onClick={() => void save()}>Kaydet</Button></DialogFooter></DialogContent></Dialog>
}

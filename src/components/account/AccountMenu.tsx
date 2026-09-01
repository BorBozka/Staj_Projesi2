import { Camera, KeyRound, LogOut, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { UserAvatar } from "@/components/account/UserAvatar"
import { normalizeAvatarFile } from "@/components/account/avatar-utils"
import type { AccountProfile } from "@/features/account/account-profile"
import { validatePasswordChange } from "@/features/account/account-utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { accountService, sessionService } from "@/services"
import { avatarChangedEvent } from "@/services/mock-account-service"

type AccountMenuVariant = "header" | "sidebar"

interface AccountMenuProps {
  profile: AccountProfile
  variant?: AccountMenuVariant
  collapsed?: boolean
  className?: string
}

export function AccountMenu({ profile, variant = "header", collapsed = false, className }: AccountMenuProps) {
  const [avatar, setAvatar] = useState(profile.avatar)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [feedback, setFeedback] = useState("")

  useEffect(() => {
    let active = true
    void accountService.getAvatar(profile.id).then((storedAvatar) => { if (active) setAvatar(storedAvatar ?? profile.avatar) })
    const handleAvatarChange = (event: Event) => {
      if ((event as CustomEvent<{ userId: string }>).detail.userId === profile.id) void accountService.getAvatar(profile.id).then((storedAvatar) => setAvatar(storedAvatar))
    }
    window.addEventListener(avatarChangedEvent, handleAvatarChange)
    return () => { active = false; window.removeEventListener(avatarChangedEvent, handleAvatarChange) }
  }, [profile.avatar, profile.id])

  const isSidebar = variant === "sidebar"
  const trigger = isSidebar ? (
    <button type="button" className={cn("flex min-w-0 items-center gap-2.5 rounded-md px-1 py-2 text-left transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500", collapsed && "justify-center px-0", className)} aria-label={`Hesap menüsü: ${profile.fullName}, ${profile.roleLabel}`} title={collapsed ? `${profile.fullName} · ${profile.roleLabel}` : undefined}>
      <UserAvatar {...profile} avatar={avatar} className="size-9 shrink-0" />
      <div aria-hidden={collapsed} className={cn("min-w-0 leading-tight transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none", collapsed ? "w-0 translate-x-1 opacity-0" : "translate-x-0 opacity-100 delay-100")}>
        <p className="truncate text-sm font-semibold text-white">{profile.fullName}</p>
        <p className="mt-0.5 truncate text-xs text-slate-400">{profile.roleLabel}</p>
      </div>
    </button>
  ) : (
    <button type="button" className={cn("flex min-w-0 items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500", className)} aria-label={`Hesap menüsü: ${profile.fullName}, ${profile.roleLabel}`}>
      <div className="hidden min-w-0 text-right leading-tight sm:block"><p className="truncate text-xs font-semibold text-slate-900">{profile.fullName}</p><p className="truncate text-[11px] text-slate-500">{profile.roleLabel}</p></div>
      <UserAvatar {...profile} avatar={avatar} className="size-8 shrink-0" />
    </button>
  )

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-1.5" aria-label="Hesap menüsü">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <UserAvatar {...profile} avatar={avatar} className="size-9 shrink-0" />
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{profile.fullName}</p><p className="truncate text-xs text-slate-500">{profile.roleLabel}</p></div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setPhotoOpen(true)}><Camera className="size-4 text-slate-500" />Profil fotoğrafını değiştir</DropdownMenuItem>
        {profile.authenticationSource === "LOCAL" && <DropdownMenuItem onSelect={() => setPasswordOpen(true)}><KeyRound className="size-4 text-slate-500" />Şifreyi değiştir</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => { void sessionService.logout() }} className="text-red-600 focus:bg-red-50 focus:text-red-700"><LogOut className="size-4" />Çıkış yap</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <AvatarDialog open={photoOpen} onOpenChange={setPhotoOpen} profile={profile} avatar={avatar} onSaved={() => setFeedback("Profil fotoğrafı güncellendi.")} />
    <PasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} profile={profile} onSaved={() => setFeedback("Şifreniz güncellendi.")} />
    {feedback && <p role="status" className="sr-only">{feedback}</p>}
  </>
}

function AvatarDialog({ open, onOpenChange, profile, avatar, onSaved }: { open: boolean; onOpenChange(open: boolean): void; profile: AccountProfile; avatar?: string; onSaved(): void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingAvatar, setPendingAvatar] = useState<string | undefined>()
  const [removeRequested, setRemoveRequested] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const preview = pendingAvatar ?? avatar

  useEffect(() => { if (open) { setPendingAvatar(undefined); setRemoveRequested(false); setError("") } }, [open])
  const selectPhoto = async (file?: File) => {
    if (!file) return
    setError("")
    try { setPendingAvatar(await normalizeAvatarFile(file)); setRemoveRequested(false) } catch (caught) { setError(caught instanceof Error ? caught.message : "Fotoğraf okunamadı.") }
  }
  const save = async () => {
    setSaving(true); setError("")
    try {
      if (pendingAvatar) await accountService.updateAvatar(profile.id, pendingAvatar)
      else if (removeRequested) await accountService.removeAvatar(profile.id)
      onSaved(); onOpenChange(false)
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Fotoğraf kaydedilemedi.") } finally { setSaving(false) }
  }
  const remove = () => { setPendingAvatar(undefined); setRemoveRequested(true) }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Profil fotoğrafını değiştir</DialogTitle><DialogDescription>Fotoğraf kare olarak düzenlenir ve güvenli biçimde küçültülür.</DialogDescription></DialogHeader>
    <div className="flex items-center gap-4"><UserAvatar {...profile} avatar={removeRequested ? undefined : preview} className="size-16 shrink-0 text-base" /><div className="min-w-0 space-y-2"><Input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void selectPhoto(event.target.files?.[0]); event.currentTarget.value = "" }} /><Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>Fotoğraf seç</Button>{preview && !removeRequested && <Button type="button" variant="ghost" size="sm" className="ml-1 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={remove}><Trash2 />Fotoğrafı kaldır</Button>}<p className="text-[11px] text-slate-500">JPG, PNG veya WebP</p></div></div>
    {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
    <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>İptal</Button><Button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Kaydediliyor…" : "Kaydet"}</Button></DialogFooter>
  </DialogContent></Dialog>
}

function PasswordDialog({ open, onOpenChange, profile, onSaved }: { open: boolean; onOpenChange(open: boolean): void; profile: AccountProfile; onSaved(): void }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) { setCurrentPassword(""); setNewPassword(""); setConfirmation(""); setError("") } }, [open])
  const save = async () => {
    const validationError = validatePasswordChange(currentPassword, newPassword, confirmation)
    if (validationError) return setError(validationError)
    setSaving(true); setError("")
    try { await accountService.changePassword({ userId: profile.id, currentPassword, newPassword }); onSaved(); onOpenChange(false) } catch (caught) { setError(caught instanceof Error ? caught.message : "Şifre güncellenemedi.") } finally { setSaving(false) }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Şifreyi değiştir</DialogTitle><DialogDescription>Yeni şifreniz en az 8 karakter olmalıdır.</DialogDescription></DialogHeader>
    <div className="space-y-3"><PasswordField id="current-password" label="Mevcut şifre" value={currentPassword} onChange={setCurrentPassword} /><PasswordField id="new-password" label="Yeni şifre" value={newPassword} onChange={setNewPassword} /><PasswordField id="confirm-password" label="Yeni şifre tekrar" value={confirmation} onChange={setConfirmation} />{error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}</div>
    <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>İptal</Button><Button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Kaydediliyor…" : "Kaydet"}</Button></DialogFooter>
  </DialogContent></Dialog>
}

function PasswordField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange(value: string): void }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label} *</Label><Input id={id} type="password" autoComplete="new-password" value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

import { cn } from "@/lib/utils"

interface UserAvatarProps {
  fullName: string
  initials: string
  avatar?: string
  className?: string
}

export function UserAvatar({ fullName, initials, avatar, className }: UserAvatarProps) {
  if (avatar) return <img src={avatar} alt={`${fullName} profil fotoğrafı`} className={cn("rounded-full object-cover", className)} />
  return <span aria-label={`${fullName} avatarı`} className={cn("flex items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white", className)}>{initials}</span>
}

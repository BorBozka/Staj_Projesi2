export function validatePasswordChange(currentPassword: string, newPassword: string, confirmation: string) {
  if (!currentPassword || !newPassword || !confirmation) return "Tüm parola alanları zorunludur."
  if (newPassword.length < 8) return "Yeni şifre en az 8 karakter olmalıdır."
  if (newPassword === currentPassword) return "Yeni şifre mevcut şifreyle aynı olamaz."
  if (newPassword !== confirmation) return "Yeni şifre tekrar alanıyla eşleşmelidir."
  return undefined
}

function localMobileDigits(value: string) {
  let digits = value.replace(/\D/g, "")
  if (digits.startsWith("90")) digits = digits.slice(2)
  if (digits.startsWith("0")) digits = digits.slice(1)
  return digits.slice(0, 10)
}

/** Formats a Turkish mobile number for local form entry, including its leading zero. */
export function formatLocalVisitorPhone(value: string) {
  const rawDigits = value.replace(/\D/g, "")
  const digits = localMobileDigits(value)
  if (!digits) return rawDigits.startsWith("0") ? "0" : ""
  const local = `0${digits}`
  return [local.slice(0, 4), local.slice(4, 7), local.slice(7, 9), local.slice(9, 11)].filter(Boolean).join(" ")
}

/** Converts a local Turkish mobile number to the visitor domain display format. */
export function normalizeVisitorPhone(localInput: string) {
  const digits = localMobileDigits(localInput)
  return `+90 ${[digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)].filter(Boolean).join(" ")}`
}

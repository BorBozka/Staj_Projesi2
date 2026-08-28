import { applicationRoles, authenticationSources, isOperationalSettingsValid, type AdminUser, type ApplicationRole, type AuthenticationSource } from "@/domain/admin"
import { getPageCount as getPageCountShared, paginate } from "@/lib/pagination"
import { toggleSingleSort, type SingleSortState } from "@/lib/sort"

export const ADMIN_USERS_PAGE_SIZE = 8
export const adminUserSortFields = ["fullName", "username", "role", "company", "status"] as const
export type AdminUserSortField = (typeof adminUserSortFields)[number]
export type AdminUserStatusFilter = "all" | "active" | "passive"

export interface AdminUserFilters {
  search: string
  role: "all" | ApplicationRole
  authenticationSource: "all" | AuthenticationSource
  status: AdminUserStatusFilter
  companyId: string
}

export const defaultAdminUserFilters: AdminUserFilters = { search: "", role: "all", authenticationSource: "all", status: "all", companyId: "all" }

export function hasActiveAdminUserFilters(filters: AdminUserFilters) {
  return Boolean(filters.search.trim() || filters.role !== "all" || filters.authenticationSource !== "all" || filters.status !== "all" || filters.companyId !== "all")
}

// Pipeline stage 1: narrow by the toolbar's structural filters (role/auth source/status/company).
export function scopeAdminUsers(users: AdminUser[], filters: Pick<AdminUserFilters, "role" | "authenticationSource" | "status" | "companyId">): AdminUser[] {
  return users.filter((user) =>
    (filters.role === "all" || user.role === filters.role)
    && (filters.authenticationSource === "all" || user.authenticationSource === filters.authenticationSource)
    && (filters.status === "all" || (filters.status === "active" ? user.active : !user.active))
    && (filters.companyId === "all" || user.authorizationScope.companyIds.includes(filters.companyId)),
  )
}

// Pipeline stage 2: free-text search over the already-scoped result.
export function searchAdminUsers(users: AdminUser[], search: string): AdminUser[] {
  const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR")
  if (!normalizedSearch) return users
  return users.filter((user) => [user.fullName, user.username, user.email].join(" ").toLocaleLowerCase("tr-TR").includes(normalizedSearch))
}

// Pipeline stage 3: sort the scoped + searched result. Company sorts by the resolved,
// human-readable scope text so it matches what the column actually displays.
export function sortAdminUsers(users: AdminUser[], sort: SingleSortState<AdminUserSortField>, companies: { id: string; name: string }[] = []): AdminUser[] {
  if (!sort) return users
  return [...users].sort((left, right) => {
    const leftValue = sort.field === "company" ? getAdminUserCompanyDisplay(left.authorizationScope.companyIds, companies).full : String(left[sort.field === "status" ? "active" : sort.field])
    const rightValue = sort.field === "company" ? getAdminUserCompanyDisplay(right.authorizationScope.companyIds, companies).full : String(right[sort.field === "status" ? "active" : sort.field])
    const result = leftValue.localeCompare(rightValue, "tr", { sensitivity: "base" })
    return sort.direction === "asc" ? result : -result
  })
}

// Full pipeline in the required order: scope/filter -> text search -> sort. Pagination is a
// separate, later step (paginateAdminUsers) so callers can read the pre-pagination total.
export function filterAndSortAdminUsers(users: AdminUser[], filters: AdminUserFilters, sort: SingleSortState<AdminUserSortField>, companies: { id: string; name: string }[] = []): AdminUser[] {
  return sortAdminUsers(searchAdminUsers(scopeAdminUsers(users, filters), filters.search), sort, companies)
}

export function paginateAdminUsers(users: AdminUser[], page: number) { return paginate(users, page, ADMIN_USERS_PAGE_SIZE) }
export function getAdminUsersPageCount(total: number) { return getPageCountShared(total, ADMIN_USERS_PAGE_SIZE) }
export function toggleAdminUserSort(current: SingleSortState<AdminUserSortField>, field: AdminUserSortField) { return toggleSingleSort(current, field) }

export interface AdminUsersQueryState {
  filters: AdminUserFilters
  sort: SingleSortState<AdminUserSortField>
  page: number
}

// Filters, sort and page live in the URL — the same approach All Visits/Reports use — so they
// survive the user leaving this screen and coming back.
export function parseAdminUsersQuery(searchParams: URLSearchParams): AdminUsersQueryState {
  const roleParam = searchParams.get("role")
  const authParam = searchParams.get("auth")
  const statusParam = searchParams.get("status")
  const sortParam = searchParams.get("sort")
  const pageParam = Number(searchParams.get("page"))

  return {
    filters: {
      search: searchParams.get("q") ?? "",
      role: (applicationRoles as readonly string[]).includes(roleParam ?? "") ? roleParam as ApplicationRole : "all",
      authenticationSource: (authenticationSources as readonly string[]).includes(authParam ?? "") ? authParam as AuthenticationSource : "all",
      status: statusParam === "active" || statusParam === "passive" ? statusParam : "all",
      companyId: searchParams.get("company") ?? "all",
    },
    sort: (adminUserSortFields as readonly string[]).includes(sortParam ?? "")
      ? { field: sortParam as AdminUserSortField, direction: searchParams.get("dir") === "desc" ? "desc" : "asc" }
      : null,
    page: Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1,
  }
}

export function updateAdminUsersSearchParams(current: URLSearchParams, key: "q" | "role" | "auth" | "status" | "company", value: string) {
  const next = new URLSearchParams(current)
  if (!value || value === "all") next.delete(key)
  else next.set(key, value)
  next.delete("page")
  return next
}

export function setAdminUsersSort(current: URLSearchParams, sort: SingleSortState<AdminUserSortField>) {
  const next = new URLSearchParams(current)
  if (sort) { next.set("sort", sort.field); next.set("dir", sort.direction) } else { next.delete("sort"); next.delete("dir") }
  next.delete("page")
  return next
}

export function setAdminUsersPage(current: URLSearchParams, page: number) {
  const next = new URLSearchParams(current)
  if (page <= 1) next.delete("page")
  else next.set("page", String(page))
  return next
}

// Clears search + filters but keeps the current sort, matching how "Filtreleri temizle" behaves
// on the other list screens (sort is a display preference, not a filter).
export function clearAdminUsersSearchParams(current: URLSearchParams) {
  const next = new URLSearchParams(current)
  for (const key of ["q", "role", "auth", "status", "company", "page"]) next.delete(key)
  return next
}

// Compact "primary company +N" rendering for the multi-company scope column, plus the full
// comma-joined list for a hover/focus tooltip/aria-label. `truncated` tells the caller whether
// there's anything hidden that needs an accessible way to reach it. Never render the full list inline.
export function getAdminUserCompanyDisplay(companyIds: string[], companies: { id: string; name: string }[]): { compact: string; full: string; truncated: boolean } {
  const names = companyIds.map((companyId) => companies.find((company) => company.id === companyId)?.name ?? companyId)
  if (names.length === 0) return { compact: "—", full: "—", truncated: false }
  const [first, ...rest] = names
  return { compact: rest.length > 0 ? `${first} +${rest.length}` : first, full: names.join(", "), truncated: rest.length > 0 }
}

export const TEMPORARY_PASSWORD_MIN_LENGTH = 8

export function isTemporaryPasswordValid(password: string): boolean {
  return password.trim().length >= TEMPORARY_PASSWORD_MIN_LENGTH
}

export function doPasswordsMatch(password: string, confirmation: string): boolean {
  return password === confirmation
}

function areCompanyScopesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const bSet = new Set(b)
  return a.every((companyId) => bSet.has(companyId))
}

// Drives the edit dialog's Kaydet disabled state: true only when something a Save would actually
// persist has changed from the record as loaded. AD-owned identity fields (fullName/username/
// email) are read-only there, so they're only compared for a Local user — including them for AD
// would be a no-op anyway since the draft can never differ from the original on those fields.
export function isAdminUserFormDirty(original: AdminUser, draft: AdminUser): boolean {
  const identityDirty = original.authenticationSource === "LOCAL" && (
    draft.fullName !== original.fullName || draft.username !== original.username || draft.email !== original.email
  )
  return identityDirty
    || draft.role !== original.role
    || draft.active !== original.active
    || !areCompanyScopesEqual(draft.authorizationScope.companyIds, original.authorizationScope.companyIds)
}

// Placeholder for "who is signed in" until real authentication exists — the id must match a
// seeded Admin so the self-lockout guards below have something real to protect. A real backend
// would derive this from the authenticated session instead.
export const CURRENT_ADMIN_USER_ID = "user-1"

// Only escalating INTO Admin needs a confirmation gate — creating/editing any other role, or
// saving a user who was already Admin, should not interrupt the save flow.
export function shouldConfirmAdminRoleChange(previousRole: ApplicationRole | null, nextRole: ApplicationRole): boolean {
  return nextRole === "ADMIN" && previousRole !== "ADMIN"
}

// UI-only confirmation prompts for a critical change made to SOMEONE ELSE'S Admin account. The
// hard self-lockout/last-admin blocks live in the domain layer and are enforced by the service
// regardless of whether these confirmations were shown.
export function shouldConfirmAnotherAdminDemotion(actingUserId: string, target: Pick<AdminUser, "id" | "role">, nextRole: ApplicationRole): boolean {
  return actingUserId !== target.id && target.role === "ADMIN" && nextRole !== "ADMIN"
}

export function shouldConfirmAnotherAdminDeactivation(actingUserId: string, target: Pick<AdminUser, "id" | "role" | "active">, nextActive: boolean): boolean {
  return actingUserId !== target.id && target.role === "ADMIN" && target.active && !nextActive
}

export { isOperationalSettingsValid }

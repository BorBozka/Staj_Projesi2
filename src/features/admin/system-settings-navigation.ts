export function shouldBlockSystemSettingsNavigation(dirty: boolean, currentPathname: string, nextPathname: string): boolean {
  return dirty && currentPathname !== nextPathname
}

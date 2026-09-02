export const appModes = ["api", "demo"] as const

export type AppMode = (typeof appModes)[number]

export function resolveAppMode(value: string | undefined = import.meta.env.VITE_APP_MODE): AppMode {
  const mode = value?.trim() || "api"
  if ((appModes as readonly string[]).includes(mode)) return mode as AppMode

  throw new Error(
    `Invalid VITE_APP_MODE value "${mode}". Expected "api" or "demo".`,
  )
}

export const appMode = resolveAppMode()

export type SidebarState = "expanded" | "collapsed"

export const SIDEBAR_STORAGE_KEY = "poupabyte:sidebar-state"
export const SIDEBAR_EXPANDED_WIDTH = "280px"
export const SIDEBAR_COLLAPSED_WIDTH = "80px"

export function isSidebarState(value: string | null): value is SidebarState {
  return value === "expanded" || value === "collapsed"
}

export function getStoredSidebarState(): SidebarState {
  if (typeof document !== "undefined") {
    const state = document.documentElement.dataset.sidebarState ?? null
    if (isSidebarState(state)) {
      return state
    }
  }

  if (typeof window === "undefined") {
    return "expanded"
  }

  try {
    const state = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
    return isSidebarState(state) ? state : "expanded"
  } catch {
    return "expanded"
  }
}

export function applySidebarState(state: SidebarState) {
  if (typeof document === "undefined") {
    return
  }

  document.documentElement.dataset.sidebarState = state
}

export function persistSidebarState(state: SidebarState) {
  applySidebarState(state)

  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, state)
  } catch {
    // The UI should still work when storage is unavailable.
  }
}

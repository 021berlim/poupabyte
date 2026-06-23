const PREFIX = "poupabyte:dismiss:"

function read(key: string): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false
  try {
    return window.localStorage.getItem(`${PREFIX}${key}`) === "1"
  } catch {
    return false
  }
}

function write(key: string) {
  if (typeof window === "undefined" || !window.localStorage) return
  try {
    window.localStorage.setItem(`${PREFIX}${key}`, "1")
  } catch {
    // ignore quota errors
  }
}

export const UI_DISMISS_KEYS = {
  limitsTip: "limits-tip",
} as const

export function isUiDismissed(key: string): boolean {
  return read(key)
}

export function dismissUi(key: string) {
  write(key)
}
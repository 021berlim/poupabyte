type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
      options?: { timeout?: number },
    ) => number
    cancelIdleCallback?: (handle: number) => void
  }

export function scheduleIdleTask(task: () => void, timeout = 1200) {
  if (typeof window === "undefined") {
    return () => undefined
  }

  const idleWindow = window as IdleWindow

  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const idleId = idleWindow.requestIdleCallback(task, { timeout })
    return () => idleWindow.cancelIdleCallback?.(idleId)
  }

  const timer = globalThis.setTimeout(task, Math.min(timeout, 300))
  return () => globalThis.clearTimeout(timer)
}

"use client"

import { useRef, useState, type ReactNode, type TouchEvent } from "react"
import { cn } from "@/lib/utils"

const OPEN_THRESHOLD = 72
const MAX_OFFSET = 120

export function SwipeableRow({
  children,
  leftAction,
  rightAction,
  enabled = true,
}: {
  children: ReactNode
  leftAction?: ReactNode
  rightAction?: ReactNode
  enabled?: boolean
}) {
  const startX = useRef<number | null>(null)
  const [offset, setOffset] = useState(0)

  if (!enabled || (!leftAction && !rightAction)) {
    return <>{children}</>
  }

  function reset() {
    startX.current = null
    setOffset(0)
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    startX.current = event.touches[0]?.clientX ?? null
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (startX.current === null) return
    const currentX = event.touches[0]?.clientX ?? startX.current
    const delta = currentX - startX.current
    const next = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, delta))
    setOffset(next)
  }

  function handleTouchEnd() {
    if (offset <= -OPEN_THRESHOLD && rightAction) {
      setOffset(-MAX_OFFSET)
    } else if (offset >= OPEN_THRESHOLD && leftAction) {
      setOffset(MAX_OFFSET)
    } else {
      reset()
    }
    startX.current = null
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex w-[120px] items-center justify-start pl-3">
        {leftAction}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex w-[120px] items-center justify-end pr-3">
        {rightAction}
      </div>
      <div
        className={cn("relative bg-background transition-transform duration-200 ease-out")}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={reset}
      >
        {children}
      </div>
    </div>
  )
}
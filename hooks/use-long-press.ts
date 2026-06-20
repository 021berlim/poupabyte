"use client"

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react"

const INTERACTIVE_SELECTOR = "button, a, input, select, textarea, [role='button'], [role='menuitem']"

export function useLongPress<T extends HTMLElement = HTMLElement>(
 callback: () => void,
 { threshold = 400, moveTolerance = 10 }: { threshold?: number; moveTolerance?: number } = {},
) {
 const timerRef = useRef<number | null>(null)
 const startRef = useRef({ x: 0, y: 0 })
 const activePointerRef = useRef<number | null>(null)

 const clear = useCallback(() => {
  if (timerRef.current !== null) window.clearTimeout(timerRef.current)
  timerRef.current = null
  activePointerRef.current = null
 }, [])

 useEffect(() => clear, [clear])

 const onPointerDown = useCallback((event: ReactPointerEvent<T>) => {
  if (event.pointerType === "mouse" || (event.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return
  startRef.current = { x: event.clientX, y: event.clientY }
  activePointerRef.current = event.pointerId
  timerRef.current = window.setTimeout(() => {
   timerRef.current = null
   activePointerRef.current = null
   navigator.vibrate?.(12)
   callback()
  }, threshold)
 }, [callback, threshold])

 const onPointerMove = useCallback((event: ReactPointerEvent<T>) => {
  if (activePointerRef.current !== event.pointerId) return
  const distance = Math.hypot(event.clientX - startRef.current.x, event.clientY - startRef.current.y)
  if (distance > moveTolerance) clear()
 }, [clear, moveTolerance])

 return {
  onPointerDown,
  onPointerMove,
  onPointerUp: clear,
  onPointerCancel: clear,
  onPointerLeave: clear,
  onContextMenu: (event: ReactPointerEvent<T>) => {
   if (event.pointerType !== "mouse") event.preventDefault()
  },
 }
}

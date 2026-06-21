"use client"

import { useRef, useState, type ReactNode, type TouchEvent } from "react"
import { ArrowDown, LoaderCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const TRIGGER_DISTANCE = 72
const MAX_DISTANCE = 104

export function PullToRefresh({ children, onRefresh }: { children: ReactNode; onRefresh: () => Promise<void> | void }) {
 const startY = useRef<number | null>(null)
 const pulling = useRef(false)
 const distanceRef = useRef(0)
 const [distance, setDistance] = useState(0)
 const [refreshing, setRefreshing] = useState(false)

 function isMobile() {
  return window.matchMedia("(max-width: 767px)").matches
 }

 function isAtScrollTop() {
  return window.scrollY <= 0
 }

 function canStartPull() {
  return isMobile() && isAtScrollTop() && !refreshing
 }

 function resetPull() {
  startY.current = null
  pulling.current = false
  distanceRef.current = 0
  setDistance(0)
 }

 function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
  if (!canStartPull()) return
  startY.current = event.touches[0]?.clientY ?? null
  pulling.current = false
 }

 function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
  if (startY.current === null || refreshing) return

  if (!isAtScrollTop()) {
   resetPull()
   return
  }

  const currentY = event.touches[0]?.clientY ?? startY.current
  const delta = currentY - startY.current

  if (delta <= 0) {
   pulling.current = false
   setDistance(0)
   return
  }

  const resisted = Math.min(MAX_DISTANCE, delta * 0.48)
  pulling.current = resisted > 8
  distanceRef.current = resisted
  setDistance(resisted)

  if (pulling.current) event.preventDefault()
 }

 async function finishPull() {
  if (startY.current === null) return

  const shouldRefresh = pulling.current && distanceRef.current >= TRIGGER_DISTANCE
  resetPull()

  if (!shouldRefresh) return

  setRefreshing(true)
  setDistance(54)
  try {
   await Promise.all([
    Promise.resolve(onRefresh()),
    new Promise((resolve) => window.setTimeout(resolve, 520)),
   ])
  } finally {
   setRefreshing(false)
   setDistance(0)
  }
 }

 const progress = Math.min(1, distance / TRIGGER_DISTANCE)

 return (
  <div
   className="scroll-container relative"
   onTouchStart={handleTouchStart}
   onTouchMove={handleTouchMove}
   onTouchEnd={() => void finishPull()}
   onTouchCancel={() => void finishPull()}
  >
   <div
    className={cn(
     "pointer-events-none absolute left-1/2 top-0 z-10 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border bg-popover text-primary transition-opacity",
     distance > 0 || refreshing ? "opacity-100" : "opacity-0",
    )}
    style={{ transform: `translate(-50%, ${Math.max(-40, distance - 44)}px)` }}
    role="status"
    aria-live="polite"
    aria-label={refreshing ? "Atualizando" : progress >= 1 ? "Solte para atualizar" : "Puxe para atualizar"}
   >
    {refreshing ? (
     <LoaderCircle className="size-4 animate-spin" />
    ) : (
     <ArrowDown className="size-4 transition-transform" style={{ transform: `rotate(${progress * 180}deg)` }} />
    )}
   </div>
   <div className="transition-transform duration-150" style={{ transform: `translateY(${distance}px)` }}>
    {children}
   </div>
  </div>
 )
}
"use client"

import { useRef, useState, type ReactNode, type TouchEvent } from "react"
import { ArrowDown, LoaderCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const TRIGGER_DISTANCE = 72
const MAX_DISTANCE = 104

export function PullToRefresh({ children, onRefresh }: { children: ReactNode; onRefresh: () => Promise<void> | void }) {
 const startY = useRef<number | null>(null)
 const [distance, setDistance] = useState(0)
 const [refreshing, setRefreshing] = useState(false)

 function canStart() {
  return window.matchMedia("(max-width: 767px)").matches && window.scrollY <= 0 && !refreshing
 }

 function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
  if (canStart()) startY.current = event.touches[0]?.clientY ?? null
 }

 function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
  if (startY.current === null) return
  const delta = (event.touches[0]?.clientY ?? startY.current) - startY.current
  if (delta <= 0) {
   setDistance(0)
   return
  }
  const resisted = Math.min(MAX_DISTANCE, delta * 0.48)
  setDistance(resisted)
  if (resisted > 8) event.preventDefault()
 }

 async function finishPull() {
  if (startY.current === null) return
  startY.current = null
  if (distance < TRIGGER_DISTANCE) {
   setDistance(0)
   return
  }

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
   className="scroll-container relative touch-pan-x"
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

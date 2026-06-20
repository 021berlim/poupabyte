"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export function AutoHideTopbar({
 children,
 className,
}: {
 children: ReactNode
 className?: string
}) {
 const [visible, setVisible] = useState(true)
 const lastScrollY = useRef(0)
 const frame = useRef<number | null>(null)
 const lastTouchY = useRef(0)

 useEffect(() => {
  lastScrollY.current = window.scrollY

  function updateVisibility() {
   frame.current = null

   const currentScrollY = Math.max(window.scrollY, 0)
   const delta = currentScrollY - lastScrollY.current

   if (currentScrollY <= 16) {
    setVisible(true)
   } else if (delta > 8 && currentScrollY > 96) {
    setVisible(false)
   } else if (delta < -6) {
    setVisible(true)
   }

   lastScrollY.current = currentScrollY
  }

  function handleScroll() {
   if (frame.current !== null) return
   frame.current = window.requestAnimationFrame(updateVisibility)
  }

  function handleWheel(event: WheelEvent) {
   const currentScrollY = Math.max(window.scrollY, 0)

   if (currentScrollY <= 16) {
    setVisible(true)
   } else if (event.deltaY > 4 && currentScrollY > 96) {
    setVisible(false)
   } else if (event.deltaY < -4) {
    setVisible(true)
   }

   lastScrollY.current = currentScrollY
  }

  function handleTouchStart(event: TouchEvent) {
   lastTouchY.current = event.touches[0]?.clientY ?? 0
  }

  function handleTouchMove(event: TouchEvent) {
   const currentTouchY = event.touches[0]?.clientY ?? lastTouchY.current
   const delta = lastTouchY.current - currentTouchY
   const currentScrollY = Math.max(window.scrollY, 0)

   if (currentScrollY <= 16) {
    setVisible(true)
   } else if (delta > 6 && currentScrollY > 96) {
    setVisible(false)
   } else if (delta < -6) {
    setVisible(true)
   }

   lastTouchY.current = currentTouchY
   lastScrollY.current = currentScrollY
  }

  window.addEventListener("scroll", handleScroll, { passive: true })
  document.addEventListener("scroll", handleScroll, { passive: true, capture: true })
  window.addEventListener("wheel", handleWheel, { passive: true })
  window.addEventListener("touchstart", handleTouchStart, { passive: true })
  window.addEventListener("touchmove", handleTouchMove, { passive: true })

  return () => {
   window.removeEventListener("scroll", handleScroll)
   document.removeEventListener("scroll", handleScroll, { capture: true })
   window.removeEventListener("wheel", handleWheel)
   window.removeEventListener("touchstart", handleTouchStart)
   window.removeEventListener("touchmove", handleTouchMove)
   if (frame.current !== null) window.cancelAnimationFrame(frame.current)
  }
 }, [])

 return (
  <div
   data-auto-hide-topbar
   className={cn(
    "transition-[transform,opacity] !duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[transform,opacity] motion-reduce:!duration-[240ms]",
    visible ? "opacity-100" : "pointer-events-none opacity-0",
    className,
   )}
   style={{
    transform: visible ? "translateY(0)" : "translateY(calc(-100% - 0.75rem))",
   }}
  >
   {children}
  </div>
 )
}

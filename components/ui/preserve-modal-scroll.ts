"use client"

import * as React from "react"

type ScrollPosition = {
 x: number
 y: number
}

let lastScrollPosition: ScrollPosition = { x: 0, y: 0 }
let scrollTrackerCount = 0

export function captureModalScrollPosition() {
 if (typeof window === "undefined") return

 lastScrollPosition = {
  x: window.scrollX,
  y: window.scrollY,
 }
}

export function restoreModalScrollPosition() {
 if (typeof window === "undefined") return

 const scrollPosition = lastScrollPosition
 let frame = 0
 const timeouts: number[] = []

 const restore = () => {
  window.scrollTo(scrollPosition.x, scrollPosition.y)
 }

 restore()
 frame = window.requestAnimationFrame(() => {
  restore()
  timeouts.push(window.setTimeout(restore, 0))
  timeouts.push(window.setTimeout(restore, 50))
  timeouts.push(window.setTimeout(restore, 150))
 })

 return () => {
  window.cancelAnimationFrame(frame)
  timeouts.forEach((timeout) => window.clearTimeout(timeout))
 }
}

export function useTrackModalScrollPosition() {
 React.useEffect(() => {
  captureModalScrollPosition()
  scrollTrackerCount += 1

  if (scrollTrackerCount === 1) {
   window.addEventListener("pointerdown", captureModalScrollPosition, true)
   window.addEventListener("keydown", captureModalScrollPosition, true)
  }

  return () => {
   scrollTrackerCount -= 1

   if (scrollTrackerCount === 0) {
    window.removeEventListener("pointerdown", captureModalScrollPosition, true)
    window.removeEventListener("keydown", captureModalScrollPosition, true)
   }
  }
 }, [])
}

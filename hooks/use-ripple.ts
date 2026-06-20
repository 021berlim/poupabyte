"use client"

import { useCallback, type PointerEvent as ReactPointerEvent } from "react"

export function useRipple<T extends HTMLElement = HTMLElement>() {
 return useCallback((event: ReactPointerEvent<T>) => {
  if (event.pointerType === "mouse" && event.button !== 0) return

  const element = event.currentTarget
  if (element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true") return

  const rect = element.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 1.1
  const ripple = document.createElement("span")

  ripple.className = "app-ripple-ink"
  ripple.style.width = `${size}px`
  ripple.style.height = `${size}px`
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`
  element.appendChild(ripple)
  ripple.addEventListener("animationend", () => ripple.remove(), { once: true })
 }, [])
}

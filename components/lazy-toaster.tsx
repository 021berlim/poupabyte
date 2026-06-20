"use client"

import { useEffect, useState, type ComponentType } from "react"
import { scheduleIdleTask } from "@/lib/idle"

type ToasterComponent = ComponentType<{
 position?: "top-right"
 richColors?: boolean
 offset?: string
 mobileOffset?: string
}>

export function LazyToaster() {
 const [Toaster, setToaster] = useState<ToasterComponent | null>(null)

 useEffect(() => {
  let mounted = true

  const cancel = scheduleIdleTask(() => {
   import("@/components/ui/sonner").then((mod) => {
    if (mounted) setToaster(() => mod.Toaster as ToasterComponent)
   })
  }, 1800)

  return () => {
   mounted = false
   cancel()
  }
 }, [])

 return Toaster ? (
  <Toaster
   position="top-right"
   offset="1.25rem"
   mobileOffset="calc(1rem + env(safe-area-inset-top, 0px))"
   richColors
  />
 ) : null
}

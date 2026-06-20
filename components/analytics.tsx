"use client"

import { useEffect, useState, type ComponentType } from "react"
import { scheduleIdleTask } from "@/lib/idle"

export function Analytics() {
 const [AnalyticsComponent, setAnalyticsComponent] = useState<ComponentType | null>(null)

 useEffect(() => {
  if (process.env.NODE_ENV !== "production") return

  let mounted = true

  const cancel = scheduleIdleTask(() => {
   import("@vercel/analytics/react").then((mod) => {
    if (mounted) setAnalyticsComponent(() => mod.Analytics)
   })
  }, 2500)

  return () => {
   mounted = false
   cancel()
  }
 }, [])

 return AnalyticsComponent ? <AnalyticsComponent /> : null
}

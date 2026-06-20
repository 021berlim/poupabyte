"use client"

import { useEffect, useState, type ComponentType } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { scheduleIdleTask } from "@/lib/idle"

export function LazyNotificationCenter() {
 const [NotificationCenter, setNotificationCenter] = useState<ComponentType | null>(null)

 useEffect(() => {
  let mounted = true

  const cancel = scheduleIdleTask(() => {
   import("@/components/app/notification-center").then((mod) => {
    if (mounted) setNotificationCenter(() => mod.NotificationCenter)
   })
  }, 1600)

  return () => {
   mounted = false
   cancel()
  }
 }, [])

 if (NotificationCenter) {
  return <NotificationCenter />
 }

 return (
  <Button
   variant="ghost"
   size="icon"
   className="relative h-10 w-10 rounded-2xl border border-border/70 bg-card/80 "
   aria-label="Notificações"
   disabled
  >
   <Bell className="h-5 w-5" />
  </Button>
 )
}

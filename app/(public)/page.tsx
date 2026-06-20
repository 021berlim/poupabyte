"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { APP_HOME, ROUTES } from "@/lib/routes"
import { useStore } from "@/lib/store"

export default function Page() {
 const { user, hydrated } = useStore()
 const router = useRouter()

 useEffect(() => {
  if (!hydrated) return
  router.replace(user ? APP_HOME : ROUTES.login)
 }, [hydrated, user, router])

 return (
  <div className="flex min-h-dvh items-center justify-center overflow-x-hidden bg-background p-[clamp(1rem,5vw,1.5rem)]">
   <div className="w-full max-w-xs space-y-3">
    <Skeleton className="mx-auto h-12 w-12 rounded-2xl" />
    <Skeleton className="mx-auto h-4 w-40" />
    <Skeleton className="mx-auto h-3 w-56" />
   </div>
  </div>
 )
}

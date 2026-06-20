"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppLoadingSkeleton } from "@/components/app/app-loading-skeleton"
import { useStore } from "@/lib/store"

export function AuthGuard({ children }: { children: React.ReactNode }) {
 const { user, hydrated } = useStore()
 const router = useRouter()

 useEffect(() => {
  if (hydrated && !user) {
   router.replace("/login")
  }
 }, [hydrated, user, router])

 if (!hydrated || !user) {
  return <AppLoadingSkeleton />
 }

 return <>{children}</>
}

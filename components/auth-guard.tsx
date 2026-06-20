"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppLoadingSkeleton } from "@/components/app/app-loading-skeleton"
import { ROUTES } from "@/lib/routes"
import { useStore } from "@/lib/store"

export function AuthGuard({ children }: { children: React.ReactNode }) {
 const { user, hydrated, onboardingCompleted } = useStore()
 const router = useRouter()
 const pathname = usePathname()

 useEffect(() => {
  if (!hydrated) return
  if (!user) {
   router.replace(ROUTES.login)
   return
  }
  if (!onboardingCompleted && pathname !== ROUTES.onboarding) {
   router.replace(ROUTES.onboarding)
  }
 }, [hydrated, user, onboardingCompleted, pathname, router])

 if (!hydrated || !user) {
  return <AppLoadingSkeleton />
 }

 if (!onboardingCompleted) {
  return <AppLoadingSkeleton />
 }

 return <>{children}</>
}

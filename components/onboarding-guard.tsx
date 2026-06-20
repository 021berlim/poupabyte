"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppLoadingSkeleton } from "@/components/app/app-loading-skeleton"
import { APP_HOME } from "@/lib/routes"
import { useStore } from "@/lib/store"

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, hydrated, onboardingCompleted } = useStore()
  const router = useRouter()

  useEffect(() => {
    if (!hydrated) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (onboardingCompleted) {
      router.replace(APP_HOME)
    }
  }, [hydrated, user, onboardingCompleted, router])

  if (!hydrated || !user || onboardingCompleted) {
    return <AppLoadingSkeleton />
  }

  return <>{children}</>
}
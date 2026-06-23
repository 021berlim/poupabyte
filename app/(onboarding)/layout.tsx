"use client"

import { useEffect } from "react"

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.onboarding = "true"
    return () => {
      delete document.documentElement.dataset.onboarding
    }
  }, [])

  return children
}
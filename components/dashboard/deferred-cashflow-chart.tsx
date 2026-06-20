"use client"

import { useEffect, useState, type ComponentType } from "react"
import { FeatureCard } from "@/components/app/feature-card"
import { scheduleIdleTask } from "@/lib/idle"

type CashflowChartComponent = ComponentType<{ animationDelay?: number }>

function CashflowChartSkeleton() {
 return (
  <FeatureCard tone="surface" className="h-full min-h-[clamp(24rem,58vh,26.875rem)] animate-pulse p-[clamp(1rem,3vw,1.75rem)]">
   <div className="h-4 w-28 rounded bg-muted" />
   <div className="mt-3 h-7 w-48 rounded bg-muted" />
   <div className="mt-8 h-[clamp(16rem,44vh,20rem)] bg-muted/70" />
  </FeatureCard>
 )
}

export function DeferredCashflowChart({ animationDelay = 0 }: { animationDelay?: number }) {
 const [CashflowChart, setCashflowChart] = useState<CashflowChartComponent | null>(null)

 useEffect(() => {
  let mounted = true

  const load = () => {
   import("@/components/dashboard/cashflow-chart").then((mod) => {
    if (mounted) setCashflowChart(() => mod.CashflowChart)
   })
  }

  const cancelIdle = scheduleIdleTask(load, 1200)

  return () => {
   mounted = false
   cancelIdle()
  }
 }, [])

 return CashflowChart ? (
  <CashflowChart animationDelay={animationDelay} />
 ) : (
  <CashflowChartSkeleton />
 )
}

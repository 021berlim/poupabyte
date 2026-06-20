"use client"

import { useEffect, useState, type ComponentType } from "react"
import { FeatureCard } from "@/components/app/feature-card"
import { scheduleIdleTask } from "@/lib/idle"

type RecentTransactionsComponent = ComponentType<{ animationDelay?: number }>

function RecentTransactionsSkeleton() {
 return (
  <FeatureCard tone="surface" className="animate-pulse p-[clamp(1rem,3vw,1.5rem)]">
   <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
     <div className="h-3 w-24 rounded bg-muted" />
     <div className="mt-3 h-6 w-56 rounded bg-muted" />
     <div className="mt-3 h-4 w-64 rounded bg-muted" />
    </div>
    <div className="h-8 w-24 rounded-2xl bg-muted" />
   </div>
   <div className="mt-5 grid gap-2">
    {Array.from({ length: 6 }).map((_, index) => (
     <div key={index} className="border-b border-border/70 px-3 py-3.5 last:border-0">
      <div className="flex items-center gap-3">
       <div className="h-11 w-11 rounded-2xl bg-muted" />
       <div className="flex-1">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="mt-2 h-3 w-28 rounded bg-muted" />
       </div>
       <div className="h-8 w-28 rounded-2xl bg-muted" />
      </div>
     </div>
    ))}
   </div>
  </FeatureCard>
 )
}

export function DeferredRecentTransactions({ animationDelay = 0 }: { animationDelay?: number }) {
 const [RecentTransactions, setRecentTransactions] = useState<RecentTransactionsComponent | null>(null)

 useEffect(() => {
  let mounted = true
  const cancel = scheduleIdleTask(() => {
   import("@/components/dashboard/recent-transactions").then((mod) => {
    if (mounted) setRecentTransactions(() => mod.RecentTransactions)
   })
  }, 1400)

  return () => {
   mounted = false
   cancel()
  }
 }, [])

 return RecentTransactions ? (
  <RecentTransactions animationDelay={animationDelay} />
 ) : (
  <RecentTransactionsSkeleton />
 )
}

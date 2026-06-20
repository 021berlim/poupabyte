"use client"

import { useEffect, useState, type ComponentType } from "react"
import { FeatureCard } from "@/components/app/feature-card"
import { scheduleIdleTask } from "@/lib/idle"

type CategorySummaryComponent = ComponentType<{ animationDelay?: number }>

function CategorySummarySkeleton() {
 return (
  <FeatureCard tone="surface" className="h-full min-h-[clamp(24rem,58vh,26.875rem)] animate-pulse p-[clamp(1rem,3vw,1.5rem)]">
   <div className="flex items-start justify-between gap-4">
    <div className="flex-1">
     <div className="h-3 w-20 rounded bg-muted" />
     <div className="mt-3 h-6 w-44 rounded bg-muted" />
     <div className="mt-3 h-4 w-56 rounded bg-muted" />
    </div>
    <div className="h-11 w-11 rounded-2xl bg-muted" />
   </div>
   <div className="mt-8 space-y-4">
    {Array.from({ length: 5 }).map((_, index) => (
     <div key={index} className="border-b border-border/70 py-3.5 last:border-0">
      <div className="flex items-center gap-3">
       <div className="h-10 w-10 rounded-2xl bg-muted" />
       <div className="flex-1">
        <div className="flex justify-between gap-3">
         <div className="h-4 w-24 rounded bg-muted" />
         <div className="h-4 w-20 rounded bg-muted" />
        </div>
        <div className="mt-3 h-2.5 rounded-[4px] bg-muted" />
       </div>
      </div>
     </div>
    ))}
   </div>
  </FeatureCard>
 )
}

export function DeferredCategorySummary({ animationDelay = 0 }: { animationDelay?: number }) {
 const [CategorySummary, setCategorySummary] = useState<CategorySummaryComponent | null>(null)

 useEffect(() => {
  let mounted = true
  const cancel = scheduleIdleTask(() => {
   import("@/components/dashboard/category-summary").then((mod) => {
    if (mounted) setCategorySummary(() => mod.CategorySummary)
   })
  }, 900)

  return () => {
   mounted = false
   cancel()
  }
 }, [])

 return CategorySummary ? (
  <CategorySummary animationDelay={animationDelay} />
 ) : (
  <CategorySummarySkeleton />
 )
}

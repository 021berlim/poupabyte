"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type StandardPeriod = "month" | "3m" | "6m" | "year"

const labels: Record<StandardPeriod, string> = {
 month: "Mês",
 "3m": "3 meses",
 "6m": "6 meses",
 year: "Ano",
}

export function PeriodTabs({
 value,
 onValueChange,
 className,
}: {
 value: StandardPeriod
 onValueChange: (value: StandardPeriod) => void
 className?: string
}) {
 return (
  <Tabs value={value} onValueChange={(next) => onValueChange(next as StandardPeriod)} className={className}>
   <TabsList className="h-10 w-full justify-start overflow-x-auto rounded-xl bg-muted/70 p-1 sm:w-auto">
    {(Object.keys(labels) as StandardPeriod[]).map((period) => (
     <TabsTrigger key={period} value={period} className="min-w-max rounded-lg px-3 text-xs sm:text-sm">
      {labels[period]}
     </TabsTrigger>
    ))}
   </TabsList>
  </Tabs>
 )
}

export function periodMonths(period: StandardPeriod) {
 return period === "month" ? 1 : period === "3m" ? 3 : period === "6m" ? 6 : 12
}

export function withinStandardPeriod(iso: string, period: StandardPeriod) {
 const date = new Date(iso)
 const now = new Date()
 const cutoff = new Date(now.getFullYear(), now.getMonth() - periodMonths(period) + 1, 1)
 return date >= cutoff && date <= now
}

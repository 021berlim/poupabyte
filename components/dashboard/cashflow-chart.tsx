"use client"

import { useState } from "react"
import { MetricBody } from "@/components/app/metric-card"
import { ChartInteractiveLegend, ChartValueTooltipContent } from "@/components/ui/chart"
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select"
import { METRICS } from "@/lib/copy"
import { formatCurrency } from "@/lib/format"
import { monthlySeries } from "@/lib/selectors"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const monthOptions = [
 { value: "3", label: "3 meses" },
 { value: "6", label: "6 meses" },
 { value: "12", label: "12 meses" },
] as const

type MonthRange = (typeof monthOptions)[number]["value"]
type CashflowMetricTone = "income" | "expense"

function CashflowMetric({
 icon: Icon,
 label,
 value,
 tone,
}: {
 icon: LucideIcon
 label: string
 value: number
 tone: CashflowMetricTone
}) {
 return (
  <div
   className={cn(
    "min-w-0 border-l pl-3",
    tone === "income"
     ? "border-success/30 text-success"
     : "border-destructive/30 text-destructive",
   )}
  >
   <MetricBody
    label={label}
    value={formatCurrency(value)}
    icon={<Icon className="h-3.5 w-3.5" />}
    tone="text-current"
    iconTone="bg-transparent text-current"
    iconClassName="size-7 sm:size-7"
    labelClassName="text-[10px] text-current/70"
    valueClassName="text-xs"
   />
  </div>
 )
}

export function CashflowChart({ animationDelay = 0 }: { animationDelay?: number }) {
 const { transactions } = useStore()
 const [months, setMonths] = useState<MonthRange>("6")
 const [activeSeries, setActiveSeries] = useState<string | null>(null)
 const data = monthlySeries(transactions, Number(months))
 const chartData = data.map((item) => ({
  ...item,
  income: item.income === 0 ? undefined : item.income,
  expense: item.expense === 0 ? undefined : item.expense,
 }))
 const totalIncome = data.reduce((acc, item) => acc + item.income, 0)
 const totalExpense = data.reduce((acc, item) => acc + item.expense, 0)

 return (
  <section className="h-full min-w-0 py-[clamp(1rem,3vw,1.75rem)]" data-animation-delay={animationDelay}>
   <div className="mb-6 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
    <div className="min-w-0">
     <p className="text-xs font-semibold text-primary">Fluxo de caixa</p>
     <h2 className="mt-1 text-xl font-extrabold text-foreground sm:text-2xl">
      Últimos {months} meses
     </h2>
     <p className="mt-1 text-sm text-muted-foreground">
      Entradas e gastos mês a mês no período escolhido.
     </p>
    </div>

    <div className="grid min-w-0 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] lg:grid-cols-1">
     <Select value={months} onValueChange={(value) => setMonths(value as MonthRange)}>
      <SelectTrigger
       className="w-full bg-background/80 text-xs font-bold focus-visible:border-primary"
       aria-label="Período do fluxo de caixa"
      >
       <SelectValue />
      </SelectTrigger>
      <SelectContent>
       {monthOptions.map((option) => (
        <SelectItem key={option.value} value={option.value}>
         {option.label}
        </SelectItem>
       ))}
      </SelectContent>
     </Select>

     <div className="grid min-w-0 grid-cols-2 gap-3">
      <CashflowMetric
       icon={ArrowUpRight}
       label={METRICS.income}
       value={totalIncome}
       tone="income"
      />
      <CashflowMetric
       icon={ArrowDownRight}
       label={METRICS.expense}
       value={totalExpense}
       tone="expense"
      />
     </div>
    </div>
   </div>

   <ChartInteractiveLegend
    items={[
     { key: "income", label: METRICS.income, color: "var(--chart-3)" },
     { key: "expense", label: METRICS.expense, color: "var(--chart-1)" },
    ]}
    activeKey={activeSeries}
    onActiveChange={setActiveSeries}
   />

   <div className="h-[clamp(16rem,44vh,20rem)] min-h-[16rem] w-full text-xs">
    <ResponsiveContainer width="100%" height="100%">
     <AreaChart data={chartData} margin={{ left: 4, right: 16, top: 18, bottom: 4 }}>
      <defs>
       <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.34} />
        <stop offset="70%" stopColor="var(--chart-3)" stopOpacity={0.06} />
        <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
       </linearGradient>
       <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
        <stop offset="70%" stopColor="var(--chart-1)" stopOpacity={0.05} />
        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
       </linearGradient>
      </defs>
      <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={12} />
      <YAxis
       tickLine={false}
       axisLine={false}
       tickMargin={10}
       width={70}
       tickFormatter={(value) => formatCurrency(Number(value), { hideSymbol: true })}
      />
      <Tooltip
       cursor={{ stroke: "var(--border)", strokeOpacity: 0.5 }}
       content={<ChartValueTooltipContent visibleDataKey={activeSeries} formatValue={formatCurrency} />}
      />
      <Area
       type="monotone"
       dataKey="income"
       name={METRICS.income}
       stroke="var(--chart-3)"
       fill="url(#fillIncome)"
       strokeWidth={3}
       activeDot={{ r: 5, strokeWidth: 3 }}
       dot={false}
       opacity={activeSeries === null || activeSeries === "income" ? 1 : 0.25}
       onMouseEnter={() => setActiveSeries("income")}
       onMouseLeave={() => setActiveSeries(null)}
       className="transition-opacity"
      />
      <Area
       type="monotone"
       dataKey="expense"
       name={METRICS.expense}
       stroke="var(--chart-1)"
       fill="url(#fillExpense)"
       strokeWidth={3}
       activeDot={{ r: 5, strokeWidth: 3 }}
       dot={false}
       opacity={activeSeries === null || activeSeries === "expense" ? 1 : 0.25}
       onMouseEnter={() => setActiveSeries("expense")}
       onMouseLeave={() => setActiveSeries(null)}
       className="transition-opacity"
      />
     </AreaChart>
    </ResponsiveContainer>
   </div>
  </section>
 )
}

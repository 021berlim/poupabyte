"use client"

import { useMemo, useState } from "react"
import { PageHeader } from "@/components/app/page-header"
import { StatStrip } from "@/components/app/stat-strip"
import { ChartInteractiveLegend, ChartValueTooltipContent } from "@/components/ui/chart"
import { formatCurrency } from "@/lib/format"
import { buildMonthlyPlanning, monthlyCashflowPlanning } from "@/lib/planning"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { ArrowDownRight, ArrowUpRight, CalendarRange } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

type Period = "3m" | "6m" | "year"
const PERIODS: { value: Period; label: string; months: number }[] = [
 { value: "3m", label: "3 meses", months: 3 },
 { value: "6m", label: "6 meses", months: 6 },
 { value: "year", label: "12 meses", months: 12 },
]

export default function CashflowPage() {
 const { financialProfile, transactions, subscriptions, installments, goals, limits } = useStore()
 const [period, setPeriod] = useState<Period>("6m")
 const months = PERIODS.find((item) => item.value === period)?.months ?? 6

 const rows = useMemo(
  () => monthlyCashflowPlanning(financialProfile, transactions, subscriptions, installments, months),
  [financialProfile, transactions, subscriptions, installments, months],
 )

 const currentPlanning = useMemo(
  () => buildMonthlyPlanning(financialProfile, transactions, goals, subscriptions, installments, limits),
  [financialProfile, transactions, goals, subscriptions, installments, limits],
 )

 const current = rows.at(-1)
 const change = (current?.projectedBalance ?? 0) - (current?.realizedBalance ?? 0)
 const biggestIncome = [...transactions].filter((t) => t.type === "income").sort((a, b) => b.amount - a.amount)[0]
 const biggestExpense = [...transactions].filter((t) => t.type === "expense").sort((a, b) => b.amount - a.amount)[0]

 return (
  <div className="min-w-0 space-y-[clamp(1rem,3vw,1.5rem)]">
   <PageHeader title="Planejamento" subtitle="Veja como o mês está indo." />

   <div className="border-b">
    <div className="grid min-w-0 grid-cols-3">
     {PERIODS.map((item) => <button key={item.value} onClick={() => setPeriod(item.value)} className={cn("min-w-0 truncate border-b-2 px-1 py-3 text-[11px] font-semibold transition-colors sm:px-3 sm:text-sm", period === item.value ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{item.label}</button>)}
    </div>
   </div>

   <StatStrip items={[
    { label: "Entrou (realizado)", value: formatCurrency(current?.realizedIncome ?? 0), detail: "receitas confirmadas", tone: "text-success" },
    { label: "Saiu (realizado)", value: formatCurrency(current?.realizedExpense ?? 0), detail: "despesas confirmadas", tone: "text-destructive" },
    { label: "Projeção fim do mês", value: formatCurrency(current?.projectedBalance ?? 0), detail: currentPlanning.daysLeft > 0 ? `${currentPlanning.daysLeft} dias restantes` : "mês encerrando", tone: (current?.projectedBalance ?? 0) >= 0 ? "text-success" : "text-destructive" },
   ]} />

   <section className="app-open-section">
    <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
     <div
      className={cn(
       "flex min-w-0 gap-4",
       currentPlanning.endOfMonthProjection < 0 && "pl-1",
      )}
     >
      {currentPlanning.endOfMonthProjection < 0 ? (
       <span aria-hidden className="w-1 shrink-0 self-stretch rounded-full bg-destructive" />
      ) : null}
      <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Projeção de fim do mês</p>
      <p className="mt-2 text-[clamp(2rem,6vw,3.5rem)] font-extrabold leading-none tabular-nums">{formatCurrency(currentPlanning.endOfMonthProjection)}</p>
      <p className={cn("mt-2 text-sm", currentPlanning.endOfMonthProjection < 0 ? "font-semibold text-destructive" : "text-muted-foreground")}>
       {currentPlanning.endOfMonthProjection >= 0 ? "Projeção positiva no fim do mês." : "Risco de déficit no fim do mês."}
      </p>
      <p className={cn("mt-2 text-sm font-semibold", change >= 0 ? "text-success" : "text-destructive")}>
       Diferença realizado vs previsto: {change >= 0 ? "+" : "−"}{formatCurrency(Math.abs(change))}
      </p>
      </div>
     </div>
     <div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarRange className="h-4 w-4" />{PERIODS.find((item) => item.value === period)?.label}</div>
    </div>

    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_15rem]">
     <div className="min-w-0">
      <ChartInteractiveLegend items={[
        { key: "realized", label: "Realizado", color: "var(--chart-1)" },
        { key: "projected", label: "Previsto", color: "var(--chart-3)" },
      ]} />
      <div className="h-[clamp(18rem,45vw,25rem)] min-w-0">
       <ResponsiveContainer width="100%" height="100%">
       <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={24} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} width={72} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickFormatter={(value) => Intl.NumberFormat("pt-BR", { notation: "compact", style: "currency", currency: "BRL" }).format(value)} />
        <Tooltip content={<ChartValueTooltipContent valueLabel="Valor" formatValue={formatCurrency} />} cursor={{ fill: "var(--muted)", opacity: 0.2 }} />
        <Bar dataKey="realizedExpense" name="Despesa realizada" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="projectedExpense" name="Despesa prevista" fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={28} />
       </BarChart>
       </ResponsiveContainer>
      </div>
     </div>

     <div className="divide-y border-y lg:border-y-0 lg:border-l lg:pl-6">
      <div className="py-5 lg:pt-0"><ArrowUpRight className="h-4 w-4 text-success" /><p className="mt-3 text-xs text-muted-foreground">Maior receita</p><p className="mt-1 font-extrabold tabular-nums text-success">{biggestIncome ? formatCurrency(biggestIncome.amount) : "—"}</p><p className="mt-1 truncate text-xs text-muted-foreground">{biggestIncome?.description ?? "Sem receitas"}</p></div>
      <div className="py-5"><ArrowDownRight className="h-4 w-4 text-destructive" /><p className="mt-3 text-xs text-muted-foreground">Maior despesa</p><p className="mt-1 font-extrabold tabular-nums text-destructive">{biggestExpense ? formatCurrency(biggestExpense.amount) : "—"}</p><p className="mt-1 truncate text-xs text-muted-foreground">{biggestExpense?.description ?? "Sem despesas"}</p></div>
      <div className="py-5"><p className="text-xs text-muted-foreground">Renda comprometida</p><p className="mt-1 font-extrabold tabular-nums">{Math.round(currentPlanning.monthCommittedPercent)}%</p><p className="mt-1 text-xs text-muted-foreground">salário declarado: {formatCurrency(currentPlanning.declaredSalary)}</p></div>
      <div className="py-5"><p className="text-xs text-muted-foreground">Despesas fixas pendentes</p><p className="mt-1 font-extrabold tabular-nums">{formatCurrency(currentPlanning.pendingFixedExpenses)}</p><p className="mt-1 text-xs text-muted-foreground">assinaturas e parcelas</p></div>
      <div className="py-5"><p className="text-xs text-muted-foreground">Disponível para gastar</p><p className="mt-1 font-extrabold tabular-nums text-success">{formatCurrency(currentPlanning.safeToSpend)}</p><p className="mt-1 text-xs text-muted-foreground">com base em {formatCurrency(currentPlanning.receivedIncome)} recebidos no mês</p></div>
     </div>
    </div>
   </section>
  </div>
 )
}
"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { PageHeader } from "@/components/app/page-header"
import { StatStrip } from "@/components/app/stat-strip"
import { ChartInteractiveLegend, ChartValueTooltipContent } from "@/components/ui/chart"
import { formatCurrency } from "@/lib/format"
import { buildMonthlyPlanning, monthlyCashflowPlanning } from "@/lib/planning"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { NAV_LABELS, PAGE_SUBTITLES } from "@/lib/copy"
import { ROUTES } from "@/lib/routes"
import { ArrowDownRight, ArrowUpRight, CalendarRange } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

type Period = "3m" | "6m" | "year"
const PERIODS: { value: Period; label: string; months: number }[] = [
 { value: "3m", label: "3 meses", months: 3 },
 { value: "6m", label: "6 meses", months: 6 },
 { value: "year", label: "12 meses", months: 12 },
]

export default function CashflowPage() {
 const { financialProfile, transactions, subscriptions, installments, goals, limits, lastImport } = useStore()
 const [period, setPeriod] = useState<Period>("6m")
 const months = PERIODS.find((item) => item.value === period)?.months ?? 6

 const rows = useMemo(
  () => monthlyCashflowPlanning(financialProfile, transactions, subscriptions, installments, months),
  [financialProfile, transactions, subscriptions, installments, months],
 )

 const currentPlanning = useMemo(
  () => buildMonthlyPlanning(financialProfile, transactions, goals, subscriptions, installments, limits, new Date(), lastImport),
  [financialProfile, transactions, goals, subscriptions, installments, limits, lastImport],
 )

 const current = rows.at(-1)
 const change = (current?.projectedBalance ?? 0) - (current?.realizedBalance ?? 0)
 const biggestIncome = [...transactions].filter((t) => t.type === "income").sort((a, b) => b.amount - a.amount)[0]
 const biggestExpense = [...transactions].filter((t) => t.type === "expense").sort((a, b) => b.amount - a.amount)[0]

 return (
  <div className="min-w-0 space-y-[clamp(1rem,3vw,1.5rem)]">
   <PageHeader title={NAV_LABELS.cashflow} subtitle={PAGE_SUBTITLES.cashflow} />

   <div className="border-b">
    <div className="grid min-w-0 grid-cols-3">
     {PERIODS.map((item) => <button key={item.value} onClick={() => setPeriod(item.value)} className={cn("min-w-0 truncate border-b-2 px-1 py-3 text-[11px] font-semibold transition-colors sm:px-3 sm:text-sm", period === item.value ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{item.label}</button>)}
    </div>
   </div>

   <StatStrip items={[
    { label: "Entradas (realizado)", value: formatCurrency(current?.realizedIncome ?? 0), detail: "confirmadas no período", tone: "text-success" },
    { label: "Gastos (realizado)", value: formatCurrency(current?.realizedExpense ?? 0), detail: "confirmados no período", tone: "text-destructive" },
    { label: "Dias restantes", value: currentPlanning.daysLeft, detail: currentPlanning.daysLeft > 0 ? "até o fim do mês" : "mês encerrando", tone: "text-foreground" },
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
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Saldo previsto no fim do mês</p>
      <p className="mt-2 text-[clamp(2rem,6vw,3.5rem)] font-extrabold leading-none tabular-nums">{formatCurrency(currentPlanning.endOfMonthProjection)}</p>
      <p className="mt-2 text-sm text-muted-foreground">
       {formatCurrency(currentPlanning.receivedIncome)} de entrada · {formatCurrency(currentPlanning.confirmedExpenses)} de gasto · faltam {currentPlanning.daysLeft} dias
      </p>
      <p className={cn("mt-2 text-sm", currentPlanning.endOfMonthProjection < 0 ? "font-semibold text-destructive" : "text-muted-foreground")}>
       {currentPlanning.endOfMonthProjection >= 0 ? (
        "Deve fechar no positivo."
       ) : (
        <>
         Nesse ritmo, o mês fecha negativo.{" "}
         <Link href={ROUTES.assistant} className="font-semibold text-primary hover:underline">
          Penny pode sugerir 3 gastos pra cortar →
         </Link>
        </>
       )}
      </p>
      <p className={cn("mt-2 text-sm font-semibold", change >= 0 ? "text-success" : "text-destructive")}>
       Realizado vs previsto: {change >= 0 ? "+" : "−"}{formatCurrency(Math.abs(change))}
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
        <Bar dataKey="realizedExpense" name="Gasto realizado" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="projectedExpense" name="Gasto previsto" fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={28} />
       </BarChart>
       </ResponsiveContainer>
      </div>
     </div>

     <div className="divide-y border-y lg:border-y-0 lg:border-l lg:pl-6">
      <div className="py-5 lg:pt-0"><ArrowUpRight className="h-4 w-4 text-success" /><p className="mt-3 text-xs text-muted-foreground">Maior entrada</p><p className="mt-1 font-extrabold tabular-nums text-success">{biggestIncome ? formatCurrency(biggestIncome.amount) : "—"}</p><p className="mt-1 truncate text-xs text-muted-foreground">{biggestIncome?.description ?? "Sem entradas"}</p></div>
      <div className="py-5"><ArrowDownRight className="h-4 w-4 text-destructive" /><p className="mt-3 text-xs text-muted-foreground">Maior gasto</p><p className="mt-1 font-extrabold tabular-nums text-destructive">{biggestExpense ? formatCurrency(biggestExpense.amount) : "—"}</p><p className="mt-1 truncate text-xs text-muted-foreground">{biggestExpense?.description ?? "Sem gastos"}</p></div>
      <div className="py-5"><p className="text-xs text-muted-foreground">Renda já usada</p><p className="mt-1 font-extrabold tabular-nums">{Math.round(currentPlanning.monthCommittedPercent)}%</p><p className="mt-1 text-xs text-muted-foreground">renda: {formatCurrency(currentPlanning.declaredSalary)}</p></div>
      <div className="py-5"><p className="text-xs text-muted-foreground">Gastos fixos pendentes</p><p className="mt-1 font-extrabold tabular-nums">{formatCurrency(currentPlanning.pendingFixedExpenses)}</p><p className="mt-1 text-xs text-muted-foreground">assinaturas e parcelas</p></div>
      <div className="py-5"><p className="text-xs text-muted-foreground">Saldo disponível</p><p className="mt-1 font-extrabold tabular-nums text-success">{formatCurrency(currentPlanning.safeToSpend)}</p><p className="mt-1 text-xs text-muted-foreground">com {formatCurrency(currentPlanning.receivedIncome)} de entradas no mês</p></div>
     </div>
    </div>
   </section>
  </div>
 )
}
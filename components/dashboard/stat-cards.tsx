"use client"

import { useStore } from "@/lib/store"
import { MetricCard, MetricGrid } from "@/components/app/metric-card"
import { formatCurrency } from "@/lib/format"
import {
 totalBalance,
 monthIncome,
 monthExpense,
 accumulatedSavings,
} from "@/lib/selectors"
import { Wallet, ArrowUpRight, ArrowDownRight, PiggyBank } from "lucide-react"

export function StatCards() {
 const { transactions } = useStore()
 const balance = totalBalance(transactions)
 const income = monthIncome(transactions)
 const expense = monthExpense(transactions)
 const savings = accumulatedSavings(transactions)

 const stats = [
  {
   label: "Saldo total",
   value: balance,
   helper: "Entradas menos saídas",
   icon: Wallet,
   tone: "text-primary",
   iconTone: "bg-primary/10 text-primary",
  },
  {
   label: "Receitas do mês",
   value: income,
   helper: "Entradas confirmadas",
   icon: ArrowUpRight,
   tone: "text-success",
   iconTone: "bg-success/10 text-success",
  },
  {
   label: "Despesas do mês",
   value: expense,
   helper: "Saídas registradas",
   icon: ArrowDownRight,
   tone: "text-destructive",
   iconTone: "bg-destructive/10 text-destructive",
  },
  {
   label: "Economia acumulada",
   value: savings,
   helper: savings >= 0 ? "No positivo" : "No negativo",
   icon: PiggyBank,
   tone: savings >= 0 ? "text-success" : "text-destructive",
   iconTone: "bg-secondary/10 text-foreground",
  },
 ]

 return (
  <MetricGrid className="xl:grid-cols-4">
   {stats.map((s) => {
    const Icon = s.icon
    return (
     <MetricCard
      key={s.label}
      label={s.label}
      value={formatCurrency(s.value)}
      helper={s.helper}
      icon={<Icon className="h-4 w-4" />}
      tone={s.tone}
      iconTone={s.iconTone}
     />
    )
   })}
  </MetricGrid>
 )
}

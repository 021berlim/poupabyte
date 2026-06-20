"use client"

import Link from "next/link"
import { ROUTES } from "@/lib/routes"
import { useStore } from "@/lib/store"
import { FeatureCard } from "@/components/app/feature-card"
import { Button } from "@/components/ui/button"
import { TransactionRow } from "@/components/app/transaction-row"
import { ArrowRight, Receipt } from "lucide-react"

export function RecentTransactions({ animationDelay = 0 }: { animationDelay?: number }) {
 const { transactions } = useStore()
 const recent = [...transactions]
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 6)

 return (
  <FeatureCard tone="surface" delay={animationDelay} className="min-w-0 p-[clamp(1rem,3vw,1.5rem)]">
   <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
     <p className="text-xs font-semibold text-primary">Atividade recente</p>
     <h2 className="mt-1 text-xl font-extrabold text-foreground">Últimas movimentações</h2>
     <p className="mt-1 text-sm text-muted-foreground">Transações mais recentes da sua conta</p>
    </div>
    <Button asChild variant="ghost" size="sm" className="w-fit rounded-2xl border bg-background/70 text-primary hover:bg-accent">
     <Link href={ROUTES.transactions}>
      Ver tudo <ArrowRight className="h-4 w-4" />
     </Link>
    </Button>
   </div>

   {recent.length === 0 ? (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
     <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
      <Receipt className="h-5 w-5" />
     </span>
     <div>
      <p className="text-sm font-bold">Nenhuma transação ainda</p>
      <p className="mt-1 text-xs text-muted-foreground">Adicione sua primeira movimentação.</p>
     </div>
    </div>
   ) : (
    <ul className="mt-5 divide-y">
     {recent.map((tx) => (
      <li
       key={tx.id}
      className="app-row-hover px-[clamp(0.5rem,2vw,0.75rem)]"
      >
       <TransactionRow tx={tx} />
      </li>
     ))}
    </ul>
   )}
  </FeatureCard>
 )
}

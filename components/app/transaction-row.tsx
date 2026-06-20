"use client"

import { createElement, type ReactNode } from "react"
import type { Transaction } from "@/lib/types"
import { resolveTransactionCategory } from "@/lib/category-system"
import { getCategoryIcon } from "@/lib/category-icons"
import { formatCurrency, formatDate } from "@/lib/format"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

export function ledgerDateParts(iso: string) {
 const date = new Date(iso)
 const day = new Intl.DateTimeFormat("pt-BR", { day: "numeric" }).format(date)
 const month = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", "").toUpperCase()
 const year = new Intl.DateTimeFormat("pt-BR", { year: "numeric" }).format(date)

 return { day, caption: `${month}. ${year}` }
}

function ledgerGroupDate(iso: string) {
 const formatted = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
 })
  .format(new Date(iso))
  .replace(".", "")

 return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function LedgerGroupHeader({ date, openingBalance }: { date: string; openingBalance?: number }) {
 return (
  <div className="flex min-w-0 items-center justify-between gap-3 border-b px-[clamp(0.75rem,3vw,1rem)] py-3">
   <p className="truncate text-sm font-medium text-muted-foreground">{ledgerGroupDate(date)}</p>
   {openingBalance !== undefined ? <p className="shrink-0 text-right text-xs text-muted-foreground">Saldo início: <span className="tabular-nums">{formatCurrency(openingBalance)}</span></p> : null}
  </div>
 )
}

export function TransactionRow({
 tx,
 actionSlot,
 variant = "compact",
 balanceAfter,
}: {
 tx: Transaction
 actionSlot?: ReactNode
 variant?: "compact" | "ledger" | "statement"
 balanceAfter?: number
}) {
 const { userCategories, hiddenSystemCategories } = useStore()
 const cat = resolveTransactionCategory(tx, { userCategories, hiddenSystemCategories })
 const Icon = getCategoryIcon(tx.category)
 const income = tx.type === "income"
 const date = ledgerDateParts(tx.date)
 const categoryPath = cat.parentLabel ? `${cat.parentLabel} › ${cat.label}` : cat.label
 const typeLabel = income ? "Receita" : tx.type === "expense" ? "Despesa" : "Transferência"

 if (variant === "ledger" || variant === "statement") {
  const grouped = variant === "statement"

  return (
   <div
    className={cn(
     "app-row-hover grid min-w-0 items-center gap-x-3 gap-y-2 px-[clamp(0.75rem,3vw,1rem)] py-3.5 md:gap-x-4",
     grouped
      ? "grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(13rem,1fr)_minmax(8rem,0.35fr)_minmax(8rem,0.25fr)_2rem]"
      : "grid-cols-[3.25rem_minmax(0,1fr)_auto] md:grid-cols-[3.75rem_minmax(13rem,1fr)_minmax(8rem,0.35fr)_minmax(8rem,0.25fr)_2rem]",
    )}
   >
    {!grouped ? (
     <div className="min-w-0">
      <p className="text-xl font-extrabold leading-none tabular-nums text-foreground md:text-lg">{date.day}</p>
      <p className="mt-1 truncate text-[10px] font-semibold uppercase leading-none text-muted-foreground">{date.caption}</p>
     </div>
    ) : null}

    <div className="flex min-w-0 items-center gap-3">
     <span
      className="flex size-10 shrink-0 items-center justify-center rounded-2xl"
      style={{ backgroundColor: `${cat.color}1f`, color: cat.color }}
     >
      {createElement(Icon, { className: "size-5" })}
     </span>
     <div className="min-w-0">
      <p className="truncate text-sm font-bold text-foreground">{tx.description}</p>
      <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{categoryPath} · {typeLabel}</p>
     </div>
    </div>

    <div className="hidden min-w-0 md:block">
     <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-muted/70 px-2.5 py-1 text-xs font-semibold text-foreground">
      {createElement(Icon, { className: "size-3.5", style: { color: cat.color } })}
      <span className="truncate">{categoryPath}</span>
     </span>
    </div>

    <div
     className={cn(
      "text-left tabular-nums md:col-auto md:ml-0 md:text-right",
      grouped ? "col-start-1 ml-[3.25rem]" : "col-start-2 ml-[3.25rem]",
     )}
    >
     <p className={cn("text-sm font-extrabold", income ? "text-success" : "text-destructive")}>
      {income ? "+" : "-"}{formatCurrency(tx.amount)}
     </p>
     {balanceAfter !== undefined ? <p className="mt-1 text-xs font-medium text-muted-foreground">{formatCurrency(balanceAfter)}</p> : null}
    </div>

    <div
     className={cn(
      "row-span-2 row-start-1 flex justify-end md:col-auto md:row-auto",
      grouped ? "col-start-2" : "col-start-3",
     )}
    >
     {actionSlot}
    </div>
   </div>
  )
 }

 return (
  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3.5 min-[460px]:flex min-[460px]:items-center">
   <span
    className="flex size-[clamp(2.5rem,11vw,2.75rem)] shrink-0 items-center justify-center rounded-2xl"
    style={{ backgroundColor: `${cat.color}1f`, color: cat.color }}
   >
    {createElement(Icon, { className: "size-[clamp(1.125rem,5vw,1.25rem)]" })}
   </span>
   <div className="min-w-0 flex-1">
    <p className="truncate text-sm font-bold text-foreground">{tx.description}</p>
    <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
     {categoryPath} &bull; {typeLabel} &bull; {formatDate(tx.date)}
    </p>
   </div>
   <div
    className={cn(
     "col-start-2 w-fit max-w-full py-1.5 text-left text-[clamp(0.75rem,3.4vw,0.875rem)] font-extrabold tabular-nums min-[460px]:col-auto min-[460px]:ml-auto min-[460px]:min-w-[112px] min-[460px]:text-right",
     actionSlot ? "col-end-3" : "col-end-4",
     income ? "text-success" : "text-destructive",
    )}
   >
    {income ? "+" : "-"}
    {formatCurrency(tx.amount)}
   </div>
   {actionSlot ? (
    <div className="col-start-3 row-start-1 shrink-0 min-[460px]:col-auto min-[460px]:row-auto">{actionSlot}</div>
   ) : null}
  </div>
 )
}

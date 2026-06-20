"use client"

import { useMemo, useState } from "react"
import { PageHeader } from "@/components/app/page-header"
import { StatStrip } from "@/components/app/stat-strip"
import { TransactionDialog } from "@/components/app/transaction-dialog"
import { StatementImportSheet } from "@/components/app/statement-import-sheet"
import { TransactionItem } from "@/components/app/transaction-item"
import { LedgerGroupHeader } from "@/components/app/transaction-row"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { CATEGORY_LIST } from "@/lib/categories"
import { formatCurrency } from "@/lib/format"
import { filterTransactions, openingBalanceBeforePeriod, transactionSummary } from "@/lib/selectors"
import { useStore } from "@/lib/store"
import type { CategoryId, TransactionType } from "@/lib/types"
import { ListFilter, Plus, Receipt, Search, X } from "lucide-react"
import { PullToRefresh } from "@/components/app/pull-to-refresh"
import { useRouter } from "next/navigation"
import { isManageCategoriesSelectValue, ManageCategoriesSelectOption } from "@/components/app/manage-categories-select-option"
import { ROUTES } from "@/lib/routes"

function groupByDay(txs: ReturnType<typeof useStore>["transactions"]) {
 const groups = new Map<string, typeof txs>()
 for (const tx of txs) {
  const key = tx.date.slice(0, 10)
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key)!.push(tx)
 }
 return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
}

function periodLabel(from: string, to: string) {
 if (!from && !to) return "todo o histórico"
 if (from && to) return `${from} a ${to}`
 if (from) return `a partir de ${from}`
 return `até ${to}`
}

export default function TransactionsPage() {
 const router = useRouter()
 const { transactions, lastImport } = useStore()
 const [search, setSearch] = useState("")
 const [type, setType] = useState<TransactionType | "all">("all")
 const [category, setCategory] = useState<CategoryId | "all">("all")
 const [from, setFrom] = useState("")
 const [to, setTo] = useState("")
 const [filtersOpen, setFiltersOpen] = useState(false)

 const filtered = useMemo(
  () => filterTransactions(transactions, { type, category, search, from, to }),
  [transactions, type, category, search, from, to],
 )
 const summary = transactionSummary(filtered)
 const grouped = groupByDay(filtered)
 const openingBalance = openingBalanceBeforePeriod(transactions, from || grouped.at(-1)?.[0])

 const filterCount = [type !== "all", category !== "all", Boolean(from), Boolean(to)].filter(Boolean).length
 const pendingReview = transactions.filter((tx) => tx.needsReview || tx.category === "nao-categorizado").length
 const confirmed = transactions.filter((tx) => !tx.needsReview && tx.category !== "nao-categorizado").length
 const possibleDuplicates = transactions.filter((tx) => tx.source === "pdf-import" && tx.needsReview).length

 function clearFilters() {
  setType("all")
  setCategory("all")
  setFrom("")
  setTo("")
 }

 const filters = (
  <>
   <div className="grid grid-cols-2 gap-3">
   <div className="space-y-1.5">
    <label className="text-xs font-semibold text-muted-foreground">Tipo</label>
    <Select value={type} onValueChange={(value) => setType(value as TransactionType | "all")}>
     <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
     <SelectContent>
      <SelectItem value="all">Todos</SelectItem>
      <SelectItem value="income">Receitas</SelectItem>
      <SelectItem value="expense">Despesas</SelectItem>
     </SelectContent>
    </Select>
   </div>
   <div className="space-y-1.5">
    <label className="text-xs font-semibold text-muted-foreground">Categoria</label>
   <Select
    value={category}
    onValueChange={(value) => {
     if (isManageCategoriesSelectValue(value)) {
      router.push(ROUTES.categories)
      return
     }
     setCategory(value as CategoryId | "all")
    }}
   >
     <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
     <SelectContent>
      <SelectItem value="all">Todas as categorias</SelectItem>
      {CATEGORY_LIST.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
      <ManageCategoriesSelectOption />
    </SelectContent>
   </Select>
    </div>
   </div>
   <div className="grid grid-cols-2 gap-3">
    <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">De</label><Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></div>
    <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Até</label><Input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div>
   </div>
  </>
 )

 return (
  <div className="min-w-0 space-y-[clamp(1rem,3vw,1.5rem)]">
   <PageHeader
    title="Movimentações"
    subtitle="Busque, filtre e revise lançamentos."
    action={(
     <div className="flex w-full items-center gap-2 sm:w-auto">
      <StatementImportSheet />
      <TransactionDialog trigger={<Button><Plus className="h-4 w-4" />Nova transação</Button>} />
     </div>
    )}
   />

   <div className="flex gap-2">
    <div className="relative min-w-0 flex-1">
     <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
     <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar lançamentos..." className="pl-9" />
    </div>
    <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
     <SheetTrigger asChild><Button variant="outline" aria-label="Abrir filtros"><ListFilter className="h-4 w-4" /><span className="hidden sm:inline">Filtros</span>{filterCount > 0 ? <span className="text-primary">{filterCount}</span> : null}</Button></SheetTrigger>
     <SheetContent side="responsive" className="overflow-hidden">
      <SheetHeader><SheetTitle>Filtrar transações</SheetTitle><SheetDescription>Refine por tipo, categoria ou período.</SheetDescription></SheetHeader>
      <div className="app-responsive-modal-body space-y-4 px-6 py-5">{filters}</div>
      <SheetFooter>
       <Button variant="outline" onClick={clearFilters}><X className="h-4 w-4" />Limpar</Button>
       <Button onClick={() => setFiltersOpen(false)}>Aplicar</Button>
      </SheetFooter>
     </SheetContent>
    </Sheet>
   </div>

   {(pendingReview > 0 || lastImport) ? (
    <div className="app-open-section text-sm text-muted-foreground">
     {pendingReview > 0 ? <p><span className="font-bold text-foreground">{pendingReview}</span> para revisar · <span className="font-bold text-foreground">{confirmed}</span> confirmadas</p> : null}
     {lastImport ? <p className="mt-1 text-xs">Última importação: {lastImport.fileName}</p> : null}
    </div>
   ) : null}

   <StatStrip items={[
    { label: "Lançamentos", value: summary.count, detail: periodLabel(from, to) },
    { label: "Receitas", value: formatCurrency(summary.income), detail: "no período filtrado", tone: "text-success" },
    { label: "Despesas", value: formatCurrency(summary.expense), detail: "no período filtrado", tone: "text-destructive" },
   ]} />

   <PullToRefresh onRefresh={() => router.refresh()}>
   {filtered.length === 0 ? (
    <div className="app-open-section flex flex-col items-center gap-2 py-14 text-center"><Receipt className="h-8 w-8 text-muted-foreground/50" /><p className="font-semibold">Nenhuma transação encontrada</p><p className="text-sm text-muted-foreground">Ajuste os filtros ou adicione uma nova transação.</p></div>
   ) : (
    <div className="app-list-section">
     <p className="border-b px-[clamp(0.75rem,3vw,1rem)] py-3 text-sm text-muted-foreground">
      Saldo no início do período: <span className="font-semibold tabular-nums text-foreground">{formatCurrency(openingBalance)}</span>
     </p>
     {grouped.map(([day, items]) => (
      <section key={day}>
       <LedgerGroupHeader date={day} />
       <ul className="divide-y">{items.map((tx) => <li key={tx.id}><TransactionItem tx={tx} actions variant="statement" /></li>)}</ul>
       {items.length > 1 ? <p className="border-t px-[clamp(0.75rem,3vw,1rem)] py-2 text-right text-xs text-muted-foreground">Total do dia: <span className="tabular-nums">{formatCurrency(items.reduce((acc, tx) => acc + (tx.type === "income" ? tx.amount : tx.type === "expense" ? -tx.amount : 0), 0))}</span></p> : null}
      </section>
     ))}
   </div>
   )}
   </PullToRefresh>
  </div>
 )
}

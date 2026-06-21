"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { createElement, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { EmptyModuleCard } from "@/components/app/empty-module-card"
import { PageHeader } from "@/components/app/page-header"
import { StatStrip } from "@/components/app/stat-strip"
import { StatusBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CurrencyInput, formatCurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { limitProgressTone, Progress } from "@/components/ui/progress"
import { isManageCategoriesSelectValue, ManageCategoriesSelectOption } from "@/components/app/manage-categories-select-option"
import { ROUTES } from "@/lib/routes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { isSystemCategoryId } from "@/lib/categories"
import { resolveCategory, selectableCategories, type CategoryContext } from "@/lib/category-system"
import { getCategoryIcon } from "@/lib/category-icons"
import { parseAmountInput } from "@/lib/finance"
import { formatCurrency } from "@/lib/format"
import { limitMonthlyHistory, limitUsage, type LimitHistoryItem } from "@/lib/selectors"
import { useStore } from "@/lib/store"
import type { CategoryRef, SpendingLimit } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CalendarRange, ChevronDown, Gauge, Pencil, Plus, Trash2 } from "lucide-react"
import { ActionSheet } from "@/components/app/action-sheet"
import { useLongPress } from "@/hooks/use-long-press"
import { useRipple } from "@/hooks/use-ripple"

function categorySelectValue(category: CategoryRef, subcategoryId?: `uc_${string}`) {
  return subcategoryId ? `${category}::${subcategoryId}` : category
}

function parseCategorySelectValue(value: string): { category: CategoryRef; subcategoryId?: `uc_${string}` } {
  const [category, subcategoryId] = value.split("::")
  return {
    category: category as CategoryRef,
    subcategoryId: subcategoryId as `uc_${string}` | undefined,
  }
}

function LimitDialog({ limit, trigger, ctx }: { limit?: SpendingLimit; trigger: ReactNode; ctx: CategoryContext }) {
  const router = useRouter()
  const { setLimit, notify } = useStore()
  const [open, setOpen] = useState(false)
  const [categoryValue, setCategoryValue] = useState(categorySelectValue("alimentacao"))
  const [amount, setAmount] = useState("")
  const options = useMemo(() => selectableCategories(ctx, "expense"), [ctx])

  function onOpenChange(next: boolean) {
    if (next) {
      setCategoryValue(categorySelectValue(limit?.category ?? "alimentacao", limit?.subcategoryId))
      setAmount(limit ? formatCurrencyInput(limit.amount) : "")
    }
    setOpen(next)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const value = parseAmountInput(amount)
    if (value <= 0) {
      notify({ kind: "error", type: "error", title: "Orçamento inválido", message: "Informe um valor maior que zero." })
      return
    }
    const { category, subcategoryId } = parseCategorySelectValue(categoryValue)
    setLimit({ id: limit?.id, category, subcategoryId, amount: value })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{limit ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
          <DialogDescription>Defina orçamento por categoria ou subcategoria.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                value={categoryValue}
                onValueChange={(value) => {
                  if (isManageCategoriesSelectValue(value)) {
                    setOpen(false)
                    router.push(ROUTES.categories)
                    return
                  }
                  setCategoryValue(value)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((item) => (
                    <SelectItem
                      key={item.depth ? `${item.parentId ?? item.id}::${item.id}` : item.id}
                      value={
                        item.depth
                          ? categorySelectValue(item.parentId ?? item.id, item.id as `uc_${string}`)
                          : categorySelectValue(item.id)
                      }
                    >
                      {item.depth ? `↳ ${item.label}` : item.label}
                    </SelectItem>
                  ))}
                  <ManageCategoriesSelectOption />
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="limit-value">Orçamento mensal</Label>
              <CurrencyInput id="limit-value" value={amount} onChange={setAmount} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="lg" className="flex-1">
              Salvar orçamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function LimitRow({
  usage,
  history,
  ctx,
}: {
  usage: ReturnType<typeof limitUsage>[number]
  history: LimitHistoryItem[]
  ctx: CategoryContext
}) {
  const { deleteLimit } = useStore()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const resolved = resolveCategory(usage.limit.category, usage.limit.subcategoryId, ctx)
  const Icon = isSystemCategoryId(usage.limit.category)
    ? getCategoryIcon(usage.limit.category)
    : getCategoryIcon("nao-categorizado")
  const percent = Math.round(usage.percent)
  const over = usage.remaining < 0
  const tone = limitProgressTone(percent)
  const status = over ? "Estourado" : percent >= 80 ? "Atenção" : "Saudável"
  const longPress = useLongPress<HTMLDivElement>(() => setActionsOpen(true))
  const createRipple = useRipple<HTMLDivElement>()
  const label = resolved.parentLabel ? `${resolved.parentLabel} › ${resolved.label}` : resolved.label

  return (
    <>
      <Collapsible
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        className="app-ripple-surface app-row-hover px-1 py-5"
        {...longPress}
        onPointerDown={(event) => {
          createRipple(event)
          longPress.onPointerDown(event)
        }}
      >
        <div className="flex items-start gap-3">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${resolved.color}1a`, color: resolved.color }}
          >
            {createElement(Icon, { className: "h-5 w-5" })}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold sm:text-base">{label}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatCurrency(usage.spent)} de {formatCurrency(usage.limit.amount)}
                </p>
                <StatusBadge className="mt-2" tone={over ? "danger" : percent >= 80 ? "warning" : "success"}>
                  {status}
                </StatusBadge>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "font-extrabold tabular-nums",
                    over ? "text-destructive" : percent >= 80 ? "text-primary" : "text-foreground",
                  )}
                >
                  {percent}%
                </p>
                <p className={cn("mt-1 text-xs", over ? "text-destructive" : "text-muted-foreground")}>
                  {over
                    ? `${formatCurrency(Math.abs(usage.remaining))} acima`
                    : `${formatCurrency(usage.remaining)} disponíveis`}
                </p>
              </div>
            </div>
            <Progress value={Math.min(100, percent)} aria-label={`${percent}% do orçamento usado · ${status}`} className={cn("mt-4 h-2.5", tone)} />
            <div className="mt-3 flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <button className="app-ripple-surface flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                  <CalendarRange className="h-3.5 w-3.5" />
                  Histórico
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", historyOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <div className="flex">
                <LimitDialog
                  limit={usage.limit}
                  ctx={ctx}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Editar limite">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  aria-label="Excluir limite"
                  onClick={() => deleteLimit(usage.limit.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CollapsibleContent>
              <div className="mt-4 grid gap-x-6 gap-y-4 border-t pt-4 sm:grid-cols-2">
                {history.map((item, index) => (
                  <div key={item.key} className="min-w-0">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="capitalize text-muted-foreground">
                        {item.label}
                        {index === history.length - 1 ? " · atual" : ""}
                      </span>
                      <span className="font-semibold tabular-nums">{formatCurrency(item.spent)}</span>
                    </div>
                    <Progress value={Math.min(100, item.percent)} className={cn("mt-2 h-1.5", limitProgressTone(item.percent))} />
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </div>
        </div>
      </Collapsible>
      <ActionSheet open={actionsOpen} onOpenChange={setActionsOpen} title={label}>
        <LimitDialog
          limit={usage.limit}
          ctx={ctx}
          trigger={
            <Button variant="ghost" className="h-12 w-full justify-start rounded-xl px-3" onClick={() => setActionsOpen(false)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          }
        />
        <Button
          variant="ghost"
          className="h-12 w-full justify-start rounded-xl px-3 text-destructive hover:text-destructive"
          onClick={() => {
            setActionsOpen(false)
            deleteLimit(usage.limit.id)
          }}
        >
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </ActionSheet>
    </>
  )
}

export default function LimitsPage() {
  const { limits, transactions, userCategories, hiddenSystemCategories } = useStore()
  const ctx: CategoryContext = useMemo(
    () => ({ userCategories, hiddenSystemCategories }),
    [userCategories, hiddenSystemCategories],
  )
  const usages = useMemo(() => limitUsage(limits, transactions), [limits, transactions])
  const histories = useMemo(
    () => new Map(limits.map((limit) => [limit.id, limitMonthlyHistory(limit, transactions, 6)])),
    [limits, transactions],
  )
  const totals = usages.reduce(
    (acc, item) => ({
      spent: acc.spent + item.spent,
      limit: acc.limit + item.limit.amount,
      exceeded: acc.exceeded + (item.remaining < 0 ? Math.abs(item.remaining) : 0),
    }),
    { spent: 0, limit: 0, exceeded: 0 },
  )
  const totalPercent = totals.limit ? Math.round((totals.spent / totals.limit) * 100) : 0

  return (
    <div className="min-w-0 space-y-[clamp(1rem,3vw,1.5rem)]">
      <PageHeader
        title="Orçamentos"
        subtitle="Controle quanto gastar por categoria."
        action={<LimitDialog ctx={ctx} trigger={<Button><Plus className="h-4 w-4" />Novo orçamento</Button>} />}
      />
      {usages.length === 0 ? (
        <EmptyModuleCard
          icon={<Gauge className="h-6 w-6" />}
          title="Crie seu primeiro orçamento"
          description="Defina um limite mensal por categoria para acompanhar seus gastos."
          action={<LimitDialog ctx={ctx} trigger={<Button><Plus className="h-4 w-4" />Criar orçamento</Button>} />}
        />
      ) : (
        <>
          <StatStrip
            items={[
              {
                label: "Gasto do mês",
                value: formatCurrency(totals.spent),
                detail: `de ${formatCurrency(totals.limit)} planejados`,
              },
              {
                label: "Uso geral",
                value: `${totalPercent}%`,
                detail: `${usages.length} orçamentos`,
                tone: totalPercent > 100 ? "text-destructive" : totalPercent >= 71 ? "text-primary" : "text-success",
              },
              {
                label: "Estourado",
                value: formatCurrency(totals.exceeded),
                detail: totals.exceeded ? "acima do orçamento" : "tudo dentro do limite",
                tone: totals.exceeded ? "text-destructive" : "text-success",
              },
            ]}
          />
          <div className="app-list-section divide-y border-t">
            {usages.map((usage) => (
              <LimitRow key={usage.limit.id} usage={usage} history={histories.get(usage.limit.id) ?? []} ctx={ctx} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

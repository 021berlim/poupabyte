"use client"

import { useMemo, useState, type FormEvent, type ReactNode } from "react"
import { useStore } from "@/lib/store"
import { PageHeader } from "@/components/app/page-header"
import { StatStrip } from "@/components/app/stat-strip"
import { LedgerGroupHeader } from "@/components/app/transaction-row"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CurrencyInput, formatCurrencyInput } from "@/components/ui/currency-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChartContainer,
  ChartInteractiveLegend,
  ChartTooltip,
  ChartValueTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  INVESTMENT_TYPE_OPTIONS,
  investmentAllocationByInstitution,
  investmentAllocationByType,
  investmentComparisonData,
  investmentEvolutionSeries,
  investmentMovements,
  investmentPerformance,
  investmentSummary,
} from "@/lib/selectors"
import { dateInputToIso, isoToDateInput, parseAmountInput, validateInvestment, validateInvestmentMovement } from "@/lib/finance"
import { daysUntil, formatCurrency, formatDate, relativeDeadline } from "@/lib/format"
import type { Investment, InvestmentMovementType, InvestmentType } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  ChevronDown,
  Landmark,
  Pencil,
  Plus,
  RefreshCcw,
  Repeat2,
  Search,
  Trash2,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts"
import { ActionSheet } from "@/components/app/action-sheet"
import { PullToRefresh } from "@/components/app/pull-to-refresh"
import { useLongPress } from "@/hooks/use-long-press"
import { useRipple } from "@/hooks/use-ripple"
import { useRouter } from "next/navigation"

const comparisonConfig = {
  investedAmount: { label: "Valor aplicado", color: "var(--chart-2)" },
  currentValue: { label: "Valor atual", color: "var(--chart-3)" },
  current: { label: "Valor atual", color: "var(--chart-3)" },
  invested: { label: "Valor aplicado", color: "var(--chart-2)" },
  returnAmount: { label: "Rendimento", color: "var(--chart-1)" },
} satisfies ChartConfig

type InvestmentChartId = "comparison" | "evolution"

function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <section className="app-open-section flex flex-col items-center gap-2 py-[clamp(3rem,12vh,4rem)] text-center">
      {icon}
      <p className="font-semibold">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </section>
  )
}

function InvestmentDialog({ investment, trigger }: { investment?: Investment; trigger: ReactNode }) {
  const { addInvestment, updateInvestment, notify } = useStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState<InvestmentType>("cdb")
  const [institution, setInstitution] = useState("")
  const [investedAmount, setInvestedAmount] = useState("")
  const [currentValue, setCurrentValue] = useState("")
  const [applicationDate, setApplicationDate] = useState("")
  const [maturityDate, setMaturityDate] = useState("")
  const [expectedReturn, setExpectedReturn] = useState("")
  const [notes, setNotes] = useState("")

  function resetInvestmentForm() {
    setName(investment?.name ?? "")
    setType(investment?.type ?? "cdb")
    setInstitution(investment?.institution ?? "")
    setInvestedAmount(investment ? formatCurrencyInput(investment.investedAmount) : "")
    setCurrentValue(investment ? formatCurrencyInput(investment.currentValue) : "")
    setApplicationDate(investment ? isoToDateInput(investment.applicationDate) : new Date().toISOString().slice(0, 10))
    setMaturityDate(investment?.maturityDate ? isoToDateInput(investment.maturityDate) : "")
    setExpectedReturn(investment?.expectedReturn !== undefined ? String(investment.expectedReturn) : "")
    setNotes(investment?.notes ?? "")
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) resetInvestmentForm()
    setOpen(nextOpen)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const investedValue = parseAmountInput(investedAmount)
    const current = currentValue.trim() ? parseAmountInput(currentValue) : investedValue
    const expected = expectedReturn.trim() ? parseAmountInput(expectedReturn) : undefined
    const draft = {
      name: name.trim(),
      type,
      institution: institution.trim(),
      investedAmount: investedValue,
      currentValue: current,
      applicationDate,
      maturityDate: maturityDate || undefined,
      expectedReturn: expected,
      notes: notes.trim() || undefined,
    }
    const errors = validateInvestment(draft)
    if (errors.length > 0) {
      notify({ kind: "error", type: "error", title: "Investimento invalido", message: errors[0] })
      return
    }

    const payload = {
      ...draft,
      applicationDate: dateInputToIso(applicationDate),
      maturityDate: maturityDate ? dateInputToIso(maturityDate) : undefined,
    }

    if (investment) {
      updateInvestment({ ...investment, ...payload })
    } else {
      addInvestment(payload)
    }

    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="app-desktop-panel-wide">
        <DialogHeader>
          <DialogTitle>{investment ? "Editar investimento" : "Novo investimento"}</DialogTitle>
          <DialogDescription>Cadastre ativos, valores, instituicao e prazos da carteira.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="investment-name">Nome</Label>
              <Input id="investment-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: CDB Liquidez" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(value) => setType(value as InvestmentType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {INVESTMENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="investment-institution">Instituicao ou corretora</Label>
            <Input id="investment-institution" value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="Ex.: Banco Byte" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="investment-applied">Valor aplicado</Label>
              <CurrencyInput id="investment-applied" value={investedAmount} onChange={setInvestedAmount} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="investment-current">Valor atual</Label>
              <CurrencyInput id="investment-current" value={currentValue} onChange={setCurrentValue} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="investment-return">Rentabilidade esperada (%)</Label>
              <Input id="investment-return" inputMode="decimal" value={expectedReturn} onChange={(event) => setExpectedReturn(event.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="investment-date">Data da aplicacao</Label>
              <Input id="investment-date" type="date" value={applicationDate} onChange={(event) => setApplicationDate(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="investment-maturity">Data de vencimento</Label>
              <Input id="investment-maturity" type="date" value={maturityDate} onChange={(event) => setMaturityDate(event.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="investment-notes">Observacoes</Label>
            <Textarea id="investment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" />
          </div>

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="lg" className="flex-1">
              {investment ? "Salvar alteracoes" : "Cadastrar investimento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MovementDialog({ investment, trigger }: { investment: Investment; trigger: ReactNode }) {
  const { addInvestmentMovement, notify } = useStore()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<InvestmentMovementType>("contribution")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState("")

  function resetMovementForm() {
    setType("contribution")
    setAmount("")
    setDate(new Date().toISOString().slice(0, 10))
    setNote("")
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) resetMovementForm()
    setOpen(nextOpen)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const value = parseAmountInput(amount)
    const draft = { type, amount: value, date, note: note.trim() || undefined }
    const errors = validateInvestmentMovement(draft, investment)
    if (errors.length > 0) {
      notify({ kind: "error", type: "error", title: "Movimentacao invalida", message: errors[0] })
      return
    }

    addInvestmentMovement(investment.id, { ...draft, date: dateInputToIso(date) })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Movimentar investimento</DialogTitle>
          <DialogDescription>{investment.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <Label>Tipo de movimentacao</Label>
            <Select value={type} onValueChange={(value) => setType(value as InvestmentMovementType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contribution">Aporte</SelectItem>
                <SelectItem value="withdrawal">Resgate</SelectItem>
                <SelectItem value="value-update">Atualizacao de valor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="movement-amount">{type === "value-update" ? "Novo valor atual" : "Valor"}</Label>
              <CurrencyInput id="movement-amount" value={amount} onChange={setAmount} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="movement-date">Data</Label>
              <Input id="movement-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="movement-note">Observacao</Label>
            <Input id="movement-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Opcional" />
          </div>

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="lg" className="flex-1">
              Registrar movimentacao
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteInvestmentDialog({ investment, open, onOpenChange }: { investment: Investment; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { deleteInvestment } = useStore()
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir investimento?</AlertDialogTitle>
          <AlertDialogDescription>O investimento &quot;{investment.name}&quot; e seu historico serao removidos.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteInvestment(investment.id)}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function InvestmentCard({ investment }: { investment: Investment; index?: number }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [open, setOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const performance = investmentPerformance(investment)
  const returnPositive = performance.returnAmount >= 0
  const maturityDays = investment.maturityDate ? daysUntil(investment.maturityDate) : null
  const nearMaturity = maturityDays !== null && maturityDays >= 0 && maturityDays <= 30
  const progress = Math.min(100, (investment.currentValue / Math.max(investment.currentValue, investment.investedAmount, 1)) * 100)
  const longPress = useLongPress<HTMLDivElement>(() => setActionsOpen(true))
  const createRipple = useRipple<HTMLDivElement>()

  return (
   <>
    <Collapsible open={open} onOpenChange={setOpen} className="app-ripple-surface app-row-hover px-1 py-[clamp(1rem,3vw,1.25rem)]" {...longPress} onPointerDown={(event) => { createRipple(event); longPress.onPointerDown(event) }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Landmark className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold">{investment.name}</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span className="truncate">{investment.institution || "Sem instituicao"}</span>
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("text-sm font-extrabold tabular-nums", returnPositive ? "text-success" : "text-destructive")}>
            {returnPositive ? "+" : ""}{performance.returnPercent.toFixed(2)}%
          </p>
          <p className="mt-1 text-sm font-bold tabular-nums">{formatCurrency(investment.currentValue)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Progress value={progress} className={cn("h-2.5", returnPositive ? "[&_[data-slot=progress-indicator]]:bg-success" : "[&_[data-slot=progress-indicator]]:bg-destructive")} />
        <CollapsibleTrigger asChild>
          <button className="ml-auto flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground" aria-label={open ? `Recolher detalhes de ${investment.name}` : `Expandir detalhes de ${investment.name}`}>
            {open ? "Recolher" : "Expandir"}<ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="mt-4 border-t pt-4">
          <div className="grid gap-4 text-sm min-[420px]:grid-cols-2">
            <div><p className="text-xs text-muted-foreground">Valor aplicado</p><p className="mt-1 font-bold tabular-nums">{formatCurrency(investment.investedAmount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Aplicado em</p><p className="mt-1 font-bold">{formatDate(investment.applicationDate)}</p></div>
            <div><p className="text-xs text-muted-foreground">Tipo</p><p className="mt-1 font-bold">{INVESTMENT_TYPE_OPTIONS.find((option) => option.id === investment.type)?.label ?? "Outros"}</p></div>
            <div><p className="text-xs text-muted-foreground">Prazo</p><p className={cn("mt-1 font-bold", nearMaturity && "text-destructive")}>{investment.maturityDate ? relativeDeadline(investment.maturityDate) : "Sem vencimento"}</p></div>
          </div>
          <p className={cn("mt-4 text-xs font-semibold tabular-nums", returnPositive ? "text-success" : "text-destructive")}>Rendimento: {returnPositive ? "+" : "−"}{formatCurrency(Math.abs(performance.returnAmount))}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <MovementDialog investment={investment} trigger={<Button variant="outline" size="sm"><Repeat2 className="h-4 w-4" />Movimentar</Button>} />
            <InvestmentDialog investment={investment} trigger={<Button variant="outline" size="sm"><Pencil className="h-4 w-4" />Editar</Button>} />
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" />Excluir</Button>
          </div>
        </div>
      </CollapsibleContent>

      <DeleteInvestmentDialog investment={investment} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </Collapsible>
    <ActionSheet open={actionsOpen} onOpenChange={setActionsOpen} title={investment.name}>
     <InvestmentDialog investment={investment} trigger={<Button variant="ghost" className="h-12 w-full justify-start rounded-xl px-3" onClick={() => setActionsOpen(false)}><Pencil className="h-4 w-4" />Editar</Button>} />
     <Button variant="ghost" className="h-12 w-full justify-start rounded-xl px-3 text-destructive hover:text-destructive" onClick={() => { setActionsOpen(false); setTimeout(() => setDeleteOpen(true), 0) }}><Trash2 className="h-4 w-4" />Excluir</Button>
    </ActionSheet>
   </>
  )
}

export default function InvestmentsPage() {
  const router = useRouter()
  const { investments, financialProfile, goals } = useStore()
  const [search, setSearch] = useState("")
  const [type, setType] = useState<InvestmentType | "all">("all")
  const [activeTypeAllocation, setActiveTypeAllocation] = useState<number | null>(null)
  const [activeInstitutionAllocation, setActiveInstitutionAllocation] = useState<number | null>(null)
  const [activeChartSeries, setActiveChartSeries] = useState<{ chart: InvestmentChartId; key: string } | null>(null)
  const summary = useMemo(() => investmentSummary(investments), [investments])
  const typeAllocation = useMemo(() => investmentAllocationByType(investments), [investments])
  const institutionAllocation = useMemo(() => investmentAllocationByInstitution(investments), [investments])
  const comparisonData = useMemo(() => investmentComparisonData(investments), [investments])
  const evolutionData = useMemo(() => investmentEvolutionSeries(investments, 6), [investments])
  const movements = useMemo(() => investmentMovements(investments), [investments])
  const groupedMovements = useMemo(() => {
    const map = new Map<string, typeof movements>()
    for (const movement of movements) {
      const key = movement.date.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(movement)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [movements])
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return investments.filter((investment) => {
      const matchesType = type === "all" ? true : investment.type === type
      const matchesSearch = query
        ? [investment.name, investment.institution, investment.notes ?? ""].some((value) => value.toLowerCase().includes(query))
        : true
      return matchesType && matchesSearch
    })
  }, [investments, search, type])

  const typeChartConfig = useMemo<ChartConfig>(
    () =>
      typeAllocation.reduce<ChartConfig>((acc, item) => {
        acc[item.key] = { label: item.label, color: item.color }
        return acc
      }, {}),
    [typeAllocation],
  )
  const institutionChartConfig = useMemo<ChartConfig>(
    () =>
      institutionAllocation.reduce<ChartConfig>((acc, item) => {
        acc[item.key] = { label: item.label, color: item.color }
        return acc
      }, {}),
    [institutionAllocation],
  )
  const typeAllocationTotal = useMemo(
    () => typeAllocation.reduce((total, entry) => total + entry.value, 0),
    [typeAllocation],
  )
  const institutionAllocationTotal = useMemo(
    () => institutionAllocation.reduce((total, entry) => total + entry.value, 0),
    [institutionAllocation],
  )
  const focusedType = activeTypeAllocation === null ? undefined : typeAllocation[activeTypeAllocation]
  const focusedInstitution = activeInstitutionAllocation === null ? undefined : institutionAllocation[activeInstitutionAllocation]
  const typeCenter = focusedType
    ? { label: focusedType.label.toUpperCase(), value: formatCurrency(focusedType.value), color: focusedType.color }
    : { label: "TOTAL", value: formatCurrency(typeAllocationTotal), color: "var(--foreground)" }
  const institutionCenter = focusedInstitution
    ? { label: focusedInstitution.label.toUpperCase(), value: formatCurrency(focusedInstitution.value), color: focusedInstitution.color }
    : { label: "TOTAL", value: formatCurrency(institutionAllocationTotal), color: "var(--foreground)" }
  const activeSeriesFor = (chart: InvestmentChartId) =>
    activeChartSeries?.chart === chart ? activeChartSeries.key : null
  const setActiveSeriesFor = (chart: InvestmentChartId, key: string | null) =>
    setActiveChartSeries((current) => {
      if (!key) return current?.chart === chart ? null : current
      if (current?.chart === chart && current.key === key) return current
      return { chart, key }
    })
  const seriesOpacity = (chart: InvestmentChartId, key: string) => {
    const focused = activeSeriesFor(chart)
    return focused === null || focused === key ? 1 : 0.25
  }

  return (
    <div className="min-w-0 space-y-[clamp(1rem,3vw,1.5rem)]">
      <PageHeader
        title="Patrimônio"
        subtitle="Reservas, investimentos e evolução."
        action={
          <InvestmentDialog
            trigger={
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" />
                Novo investimento
              </Button>
            }
          />
        }
      />

      <StatStrip items={[
        { label: "Total guardado", value: formatCurrency(summary.currentValue), detail: `${summary.assetCount} posições` },
        { label: "Total investido", value: formatCurrency(summary.totalInvested), detail: "aplicado acumulado" },
        { label: "Rendimento acumulado", value: `${summary.accumulatedReturn >= 0 ? "+" : "−"}${formatCurrency(Math.abs(summary.accumulatedReturn))}`, detail: `${summary.accumulatedReturnPercent.toFixed(2)}% · reserva mensal: ${formatCurrency(financialProfile.monthlyReserve)}`, tone: summary.accumulatedReturn >= 0 ? "text-success" : "text-destructive" },
      ]} />

      <div className="app-open-section">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar por ativo, instituicao ou observacao..." className="pl-9 focus-visible:border-primary" />
          </div>
          <Select value={type} onValueChange={(value) => setType(value as InvestmentType | "all")}>
            <SelectTrigger className="w-full lg:w-52" aria-label="Filtrar por tipo de ativo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {INVESTMENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {investments.length === 0 ? (
        <EmptyState icon={<Landmark className="h-8 w-8 text-muted-foreground/50" />} title="Nenhum investimento cadastrado" description="Cadastre seu primeiro ativo." />
      ) : (
        <Tabs defaultValue="portfolio" className="space-y-4">
          <TabsList className="h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b bg-transparent p-0">
            <TabsTrigger className="flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent" value="portfolio">Carteira</TabsTrigger>
            <TabsTrigger className="flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent" value="charts">Gráficos</TabsTrigger>
            <TabsTrigger className="flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent" value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-4">
           <PullToRefresh onRefresh={() => router.refresh()}>
            {filtered.length === 0 ? (
              <EmptyState icon={<Search className="h-8 w-8 text-muted-foreground/50" />} title="Nenhum ativo encontrado" description="Ajuste os filtros para localizar investimentos da carteira." />
            ) : (
              <div className="app-list-section divide-y border-t">
                {filtered.map((investment, index) => (
                  <InvestmentCard key={investment.id} investment={investment} index={index} />
                ))}
              </div>
            )}
           </PullToRefresh>
          </TabsContent>

          <TabsContent value="charts" className="space-y-4">
            <div className="grid min-w-0 gap-8 lg:grid-cols-2">
              <section className="flex min-w-0 flex-col gap-1 py-[clamp(1rem,3vw,1.25rem)]">
                <div className="mb-4">
                  <h2 className="text-sm font-medium text-foreground">Distribuicao por tipo</h2>
                  <p className="text-xs text-muted-foreground">Participacao percentual na carteira</p>
                </div>
                <div className="app-chart-with-legend w-full items-center gap-4">
                  <ChartContainer config={typeChartConfig} className="app-chart-canvas aspect-auto min-w-0 w-full">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <ChartTooltip content={<ChartValueTooltipContent valueLabel="Investido" formatValue={formatCurrency} />} />
                      <Pie
                        data={typeAllocation}
                        dataKey="value"
                        nameKey="label"
                        innerRadius="60%"
                        outerRadius="85%"
                        paddingAngle={2}
                        onMouseEnter={(_, index) => setActiveTypeAllocation(index)}
                        onMouseLeave={() => setActiveTypeAllocation(null)}
                      >
                        {typeAllocation.map((entry, index) => (
                          <Cell key={entry.key} fill={entry.color} opacity={activeTypeAllocation === null || activeTypeAllocation === index ? 1 : 0.35} stroke="transparent" className="transition-opacity" />
                        ))}
                      </Pie>
                      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" pointerEvents="none" style={{ fontSize: "10px", fill: "var(--muted-foreground)", letterSpacing: "0.1em" }}>{typeCenter.label}</text>
                      <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" pointerEvents="none" style={{ fontSize: "13px", fontWeight: 600, fill: typeCenter.color }}>{typeCenter.value}</text>
                    </PieChart>
                  </ChartContainer>
                  <div className="app-chart-legend min-w-0 gap-0.5">
                    {typeAllocation.map((entry, index) => (
                      <button key={entry.key} type="button" className={cn("flex min-w-0 items-center gap-2 rounded px-2 py-1 text-left transition-colors", activeTypeAllocation === index ? "bg-muted/40" : "hover:bg-muted/20 focus-visible:bg-muted/20")} onMouseEnter={() => setActiveTypeAllocation(index)} onMouseLeave={() => setActiveTypeAllocation(null)} onFocus={() => setActiveTypeAllocation(index)} onBlur={() => setActiveTypeAllocation(null)}>
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: entry.color }} />
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{entry.label}</span>
                        <span className="text-xs font-medium tabular-nums text-foreground">{Math.round(entry.percent)}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="flex min-w-0 flex-col gap-1 py-[clamp(1rem,3vw,1.25rem)]">
                <div className="mb-4">
                  <h2 className="text-sm font-medium text-foreground">Distribuicao por instituicao</h2>
                  <p className="text-xs text-muted-foreground">Concentracao por banco ou corretora</p>
                </div>
                <div className="app-chart-with-legend w-full items-center gap-4">
                  <ChartContainer config={institutionChartConfig} className="app-chart-canvas aspect-auto min-w-0 w-full">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <ChartTooltip content={<ChartValueTooltipContent valueLabel="Investido" formatValue={formatCurrency} />} />
                      <Pie
                        data={institutionAllocation}
                        dataKey="value"
                        nameKey="label"
                        innerRadius="60%"
                        outerRadius="85%"
                        paddingAngle={2}
                        onMouseEnter={(_, index) => setActiveInstitutionAllocation(index)}
                        onMouseLeave={() => setActiveInstitutionAllocation(null)}
                      >
                        {institutionAllocation.map((entry, index) => (
                          <Cell key={entry.key} fill={entry.color} opacity={activeInstitutionAllocation === null || activeInstitutionAllocation === index ? 1 : 0.35} stroke="transparent" className="transition-opacity" />
                        ))}
                      </Pie>
                      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" pointerEvents="none" style={{ fontSize: "10px", fill: "var(--muted-foreground)", letterSpacing: "0.1em" }}>{institutionCenter.label}</text>
                      <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" pointerEvents="none" style={{ fontSize: "13px", fontWeight: 600, fill: institutionCenter.color }}>{institutionCenter.value}</text>
                    </PieChart>
                  </ChartContainer>
                  <div className="app-chart-legend min-w-0 gap-0.5">
                    {institutionAllocation.map((entry, index) => (
                      <button key={entry.key} type="button" className={cn("flex min-w-0 items-center gap-2 rounded px-2 py-1 text-left transition-colors", activeInstitutionAllocation === index ? "bg-muted/40" : "hover:bg-muted/20 focus-visible:bg-muted/20")} onMouseEnter={() => setActiveInstitutionAllocation(index)} onMouseLeave={() => setActiveInstitutionAllocation(null)} onFocus={() => setActiveInstitutionAllocation(index)} onBlur={() => setActiveInstitutionAllocation(null)}>
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: entry.color }} />
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{entry.label}</span>
                        <span className="text-xs font-medium tabular-nums text-foreground">{Math.round(entry.percent)}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <div className="grid min-w-0 gap-8 lg:grid-cols-2">
              <section className="flex min-w-0 flex-col gap-1 py-[clamp(1rem,3vw,1.25rem)]">
                <div className="mb-4">
                  <h2 className="text-sm font-medium text-foreground">Aplicado vs. atual</h2>
                  <p className="text-xs text-muted-foreground">Comparacao por ativo</p>
                </div>
                <ChartInteractiveLegend
                  items={[
                    { key: "investedAmount", label: "Aplicado", color: "var(--chart-2)" },
                    { key: "currentValue", label: "Atual", color: "var(--chart-3)" },
                  ]}
                  activeKey={activeSeriesFor("comparison")}
                  onActiveChange={(key) => setActiveSeriesFor("comparison", key)}
                />
                <ChartContainer config={comparisonConfig} className="h-[clamp(14rem,42vh,18rem)] w-full">
                  <BarChart data={comparisonData} margin={{ left: 4, right: 4, top: 8 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} interval={0} tick={{ fontSize: 10 }} />
                    <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                    <ChartTooltip content={<ChartValueTooltipContent visibleDataKey={activeSeriesFor("comparison")} formatValue={formatCurrency} />} cursor={{ fill: "var(--muted)", opacity: 0.2 }} />
                    <Bar dataKey="investedAmount" name="Aplicado" fill="var(--color-investedAmount)" radius={[4, 4, 0, 0]} maxBarSize={32} opacity={seriesOpacity("comparison", "investedAmount")} onMouseEnter={() => setActiveSeriesFor("comparison", "investedAmount")} onMouseLeave={() => setActiveSeriesFor("comparison", null)} className="transition-opacity" />
                    <Bar dataKey="currentValue" name="Atual" fill="var(--color-currentValue)" radius={[4, 4, 0, 0]} maxBarSize={32} opacity={seriesOpacity("comparison", "currentValue")} onMouseEnter={() => setActiveSeriesFor("comparison", "currentValue")} onMouseLeave={() => setActiveSeriesFor("comparison", null)} className="transition-opacity" />
                  </BarChart>
                </ChartContainer>
              </section>

              <section className="flex min-w-0 flex-col gap-1 py-[clamp(1rem,3vw,1.25rem)]">
                <div className="mb-4">
                  <h2 className="text-sm font-medium text-foreground">Evolucao da carteira</h2>
                  <p className="text-xs text-muted-foreground">Valor aplicado, valor atual e rendimento</p>
                </div>
                <ChartInteractiveLegend
                  items={[
                    { key: "invested", label: "Aplicado", color: "var(--chart-2)" },
                    { key: "current", label: "Atual", color: "var(--chart-3)" },
                    { key: "returnAmount", label: "Rendimento", color: "var(--chart-1)" },
                  ]}
                  activeKey={activeSeriesFor("evolution")}
                  onActiveChange={(key) => setActiveSeriesFor("evolution", key)}
                />
                <ChartContainer config={comparisonConfig} className="h-[clamp(14rem,42vh,18rem)] w-full">
                  <LineChart data={evolutionData} margin={{ left: 4, right: 4, top: 8 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                    <ChartTooltip content={<ChartValueTooltipContent visibleDataKey={activeSeriesFor("evolution")} formatValue={formatCurrency} />} cursor={{ stroke: "var(--border)", strokeOpacity: 0.5 }} />
                    <Line type="monotone" dataKey="invested" name="Aplicado" stroke="var(--color-invested)" strokeWidth={activeSeriesFor("evolution") === "invested" ? 4 : 3} opacity={seriesOpacity("evolution", "invested")} dot={{ r: 3 }} onMouseEnter={() => setActiveSeriesFor("evolution", "invested")} onMouseLeave={() => setActiveSeriesFor("evolution", null)} className="transition-opacity" />
                    <Line type="monotone" dataKey="current" name="Atual" stroke="var(--color-current)" strokeWidth={activeSeriesFor("evolution") === "current" ? 4 : 3} opacity={seriesOpacity("evolution", "current")} dot={{ r: 3 }} onMouseEnter={() => setActiveSeriesFor("evolution", "current")} onMouseLeave={() => setActiveSeriesFor("evolution", null)} className="transition-opacity" />
                    <Line type="monotone" dataKey="returnAmount" name="Rendimento" stroke="var(--color-returnAmount)" strokeWidth={activeSeriesFor("evolution") === "returnAmount" ? 4 : 3} opacity={seriesOpacity("evolution", "returnAmount")} dot={{ r: 3 }} onMouseEnter={() => setActiveSeriesFor("evolution", "returnAmount")} onMouseLeave={() => setActiveSeriesFor("evolution", null)} className="transition-opacity" />
                  </LineChart>
                </ChartContainer>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {movements.length === 0 ? (
              <EmptyState icon={<Repeat2 className="h-8 w-8 text-muted-foreground/50" />} title="Sem movimentacoes" description="Movimentações aparecerão aqui." />
            ) : (
              <div className="app-list-section">
                {groupedMovements.map(([day, items]) => {
                  return (
                    <section key={day}>
                      <LedgerGroupHeader date={day} />
                      <ul className="divide-y">
                        {items.map((movement) => {
                          const Icon = movement.type === "contribution" ? ArrowUpFromLine : movement.type === "withdrawal" ? ArrowDownToLine : RefreshCcw
                          const label = movement.type === "contribution" ? "Aporte" : movement.type === "withdrawal" ? "Resgate" : "Atualizacao"
                          const tone = movement.type === "withdrawal" ? "text-destructive bg-destructive/10" : movement.type === "contribution" ? "text-success bg-success/10" : "text-primary bg-primary/10"
                          const valueTone = movement.type === "withdrawal" ? "text-destructive" : movement.type === "contribution" ? "text-success" : "text-primary"
                          const sign = movement.type === "contribution" ? "+" : movement.type === "withdrawal" ? "-" : ""

                          return (
                            <li key={movement.id} className="app-row-hover grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-[clamp(0.75rem,3vw,1rem)] py-3.5 md:grid-cols-[minmax(13rem,1fr)_minmax(8rem,0.35fr)_minmax(8rem,0.25fr)_2rem] md:gap-x-4">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl", tone)}>
                                  <Icon className="size-5" />
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-foreground">{movement.investmentName}</p>
                                  <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{label}</p>
                                </div>
                              </div>
                              <div className="hidden min-w-0 md:block">
                                <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-muted/70 px-2.5 py-1 text-xs font-semibold text-foreground">
                                  <Icon className={cn("size-3.5", valueTone)} />
                                  <span className="truncate">{label}</span>
                                </span>
                              </div>
                              <div className={cn("col-start-1 ml-[3.25rem] text-left text-sm font-extrabold tabular-nums md:col-auto md:ml-0 md:text-right", valueTone)}>
                                {sign}
                                {formatCurrency(movement.amount)}
                              </div>
                              <span aria-hidden="true" className="hidden md:block" />
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

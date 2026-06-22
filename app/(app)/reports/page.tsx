"use client"

import Link from "next/link"
import { useMemo, useState, type ReactNode } from "react"
import { useStore } from "@/lib/store"
import { ROUTES } from "@/lib/routes"
import { PageHeader } from "@/components/app/page-header"
import { StatStrip } from "@/components/app/stat-strip"
import { Button } from "@/components/ui/button"


import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CATEGORY_LIST, getCategory } from "@/lib/categories"
import {
  expenseByCategory,
  filterTransactions,
  goalSummary,
  investmentAllocationByType,
  investmentComparisonData,
  investmentEvolutionSeries,
  investmentSummary,
  limitUsage,
  monthlySeries,
  transactionSummary,
  yearlySeries,
} from "@/lib/selectors"
import { buildAnalysisInsights } from "@/lib/insights"
import { buildMonthlyPlanning } from "@/lib/planning"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import { EMPTY_STATES, PAGE_SUBTITLES } from "@/lib/copy"
import type { CategoryId } from "@/lib/types"
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis, type TooltipProps } from "recharts"
import { Activity, CalendarRange, Landmark, PieChart as PieChartIcon, Target } from "lucide-react"

type ReportPeriod = "month" | "3m" | "year" | "all"
type InteractiveChartId = "monthly" | "limits" | "annual" | "investments" | "evolution"

const REPORT_PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "month", label: "Este mês" },
  { value: "3m", label: "3 meses" },
  { value: "year", label: "Este ano" },
  { value: "all", label: "Tudo" },
]

const periodDateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" })

const monthlyConfig = {
  income: { label: "Entradas", color: "var(--chart-3)" },
  expense: { label: "Gastos", color: "var(--chart-1)" },
  balance: { label: "Saldo", color: "var(--foreground)" },
  accumulatedBalance: { label: "Saldo acumulado", color: "var(--chart-2)" },
} satisfies ChartConfig

const limitConfig = {
  spent: { label: "Realizado", color: "var(--chart-1)" },
  limit: { label: "Planejado", color: "var(--chart-3)" },
} satisfies ChartConfig

const investmentConfig = {
  investedAmount: { label: "Aplicado", color: "var(--chart-2)" },
  currentValue: { label: "Atual", color: "var(--chart-3)" },
  invested: { label: "Aplicado", color: "var(--chart-2)" },
  current: { label: "Atual", color: "var(--chart-3)" },
  returnAmount: { label: "Rendimento", color: "var(--chart-1)" },
} satisfies ChartConfig

function periodDescription(period: ReportPeriod) {
  const now = new Date()
  if (period === "all") return "Todo o histórico de lançamentos"
  if (period === "year") return `${now.getFullYear()} · 1 jan – 31 dez`
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return `${periodDateFormatter.format(from)} – ${periodDateFormatter.format(to)}`
  }
  const from = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return `${periodDateFormatter.format(from)} – ${periodDateFormatter.format(to)}`
}

function periodRange(period: ReportPeriod) {
  const now = new Date()
  if (period === "all") return {}
  if (period === "month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
    }
  }
  if (period === "year") {
    return {
      from: new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10),
      to: new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10),
    }
  }
  return {
    from: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  }
}

function EmptyChart({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex h-[clamp(14rem,42vh,18rem)] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      {icon}
      <p className="text-sm font-medium">{text}</p>
    </div>
  )
}

function ReportsChartTooltip({
  active,
  payload,
  label,
  valueLabel,
  visibleDataKey,
}: TooltipProps<number, string> & { valueLabel?: string; visibleDataKey?: string | null }) {
  const visibleItems = payload?.filter(
    (item) =>
      item.value !== null &&
      item.value !== undefined &&
      (!visibleDataKey || String(item.dataKey) === visibleDataKey),
  )

  if (!active || !visibleItems?.length) return null

  const heading = label ?? visibleItems[0]?.payload?.label ?? visibleItems[0]?.name

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {heading ? <p className="mb-1 font-medium text-foreground">{heading}</p> : null}
      <div className="grid gap-1">
        {visibleItems.map((item) => (
          <div key={String(item.dataKey)} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color ?? item.payload?.fill }}
            />
            <span className="text-muted-foreground">{valueLabel ?? item.name}:</span>
            <span className="font-medium tabular-nums text-foreground">
              {formatCurrency(Number(item.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReportsInlineLegend({
  items,
  activeKey,
  onActiveChange,
}: {
  items: Array<{ key: string; label: string; color: string }>
  activeKey?: string | null
  onActiveChange?: (key: string | null) => void
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          aria-pressed={activeKey === item.key}
          className={cn(
            "flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground transition-[background-color,color,opacity]",
            activeKey === item.key && "bg-muted/40 text-foreground",
            activeKey && activeKey !== item.key && "opacity-40",
            "hover:bg-muted/20 focus-visible:bg-muted/20 focus-visible:text-foreground",
          )}
          onMouseEnter={() => onActiveChange?.(item.key)}
          onMouseLeave={() => onActiveChange?.(null)}
          onFocus={() => onActiveChange?.(item.key)}
          onBlur={() => onActiveChange?.(null)}
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const {
    transactions,
    investments,
    goals,
    limits,
    financialProfile,
    subscriptions,
    installments,
    userCategories,
    hiddenSystemCategories,
  } = useStore()
  const [period, setPeriod] = useState<ReportPeriod>("year")
  const [category, setCategory] = useState<CategoryId | "all">("all")
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [activeInvestmentCategory, setActiveInvestmentCategory] = useState<number | null>(null)
  const [activeSeries, setActiveSeries] = useState<{ chart: InteractiveChartId; key: string } | null>(null)
  const range = useMemo(() => periodRange(period), [period])
  const periodContext = useMemo(() => periodDescription(period), [period])
  const pageSubtitle = useMemo(() => {
    if (period === "year") return `Resumo de ${new Date().getFullYear()}.`
    if (period === "month") return PAGE_SUBTITLES.dashboard
    if (period === "3m") return "Resumo dos últimos 3 meses."
    return PAGE_SUBTITLES.reports
  }, [period])
  const selectedCategoryLabel =
    category === "all" ? null : (CATEGORY_LIST.find((item) => item.id === category)?.label ?? getCategory(category).label)
  const filteredTransactions = useMemo(
    () =>
      filterTransactions(transactions, {
        ...range,
        category,
      }),
    [category, range, transactions],
  )
  const summary = useMemo(() => transactionSummary(filteredTransactions), [filteredTransactions])
  const incomeCount = useMemo(
    () => filteredTransactions.filter((tx) => tx.type === "income").length,
    [filteredTransactions],
  )
  const expenseCount = useMemo(
    () => filteredTransactions.filter((tx) => tx.type === "expense").length,
    [filteredTransactions],
  )
  const insightRef = useMemo(() => {
    if (range.to) return new Date(`${range.to}T12:00:00`)
    return new Date()
  }, [range.to])
  const insights = useMemo(
    () =>
      buildAnalysisInsights(
        filteredTransactions,
        financialProfile,
        goals,
        limits,
        subscriptions,
        installments,
        insightRef,
        userCategories,
        hiddenSystemCategories,
        period === "month" ? "calendar-month" : "filtered-period",
      ),
    [
      filteredTransactions,
      financialProfile,
      goals,
      limits,
      subscriptions,
      installments,
      insightRef,
      userCategories,
      hiddenSystemCategories,
      period,
    ],
  )
  const categoryData = useMemo(() => expenseByCategory(filteredTransactions), [filteredTransactions])
  const categoryTotal = useMemo(() => categoryData.reduce((acc, item) => acc + item.total, 0), [categoryData])
  const monthData = useMemo(() => monthlySeries(filteredTransactions, 6), [filteredTransactions])
  const monthChartData = useMemo(
    () =>
      monthData.map((item) => ({
        ...item,
        income: item.income === 0 ? undefined : item.income,
        expense: item.expense === 0 ? undefined : item.expense,
      })),
    [monthData],
  )
  const annualData = useMemo(() => yearlySeries(filteredTransactions, 3), [filteredTransactions])
  const annualChartData = useMemo(
    () =>
      annualData.map((item) =>
        item.income === 0 && item.expense === 0
          ? { ...item, income: undefined, expense: undefined, balance: undefined }
          : item,
      ),
    [annualData],
  )
  const limitData = useMemo(() => limitUsage(limits, filteredTransactions), [filteredTransactions, limits])
  const goalStats = useMemo(() => goalSummary(goals), [goals])
  const investmentStats = useMemo(() => investmentSummary(investments), [investments])
  const investmentAllocation = useMemo(() => investmentAllocationByType(investments), [investments])
  const investmentAllocationTotal = useMemo(
    () => investmentAllocation.reduce((total, item) => total + item.value, 0),
    [investmentAllocation],
  )
  const investmentComparison = useMemo(() => investmentComparisonData(investments), [investments])
  const investmentEvolution = useMemo(() => investmentEvolutionSeries(investments, 6), [investments])
  const hasFinancialData = filteredTransactions.length > 0 || investments.length > 0

  const categoryConfig = useMemo<ChartConfig>(
    () =>
      categoryData.reduce<ChartConfig>((acc, item) => {
        acc[item.category] = { label: item.label, color: item.color }
        return acc
      }, {}),
    [categoryData],
  )

  const investmentAllocationConfig = useMemo<ChartConfig>(
    () =>
      investmentAllocation.reduce<ChartConfig>((acc, item) => {
        acc[item.key] = { label: item.label, color: item.color }
        return acc
      }, {}),
    [investmentAllocation],
  )
  const plannedVsActual = limitData.map((item) => ({
    category: getCategory(item.limit.category).label,
    spent: item.spent,
    limit: item.limit.amount,
  }))

  const focusedCategory = activeCategory === null ? undefined : categoryData[activeCategory]
  const donutCenter = focusedCategory
    ? {
        label: focusedCategory.label.toUpperCase(),
        value: formatCurrency(focusedCategory.total),
        color: focusedCategory.color,
      }
    : { label: "TOTAL", value: formatCurrency(categoryTotal), color: "var(--foreground)" }

  const focusedInvestmentCategory =
    activeInvestmentCategory === null ? undefined : investmentAllocation[activeInvestmentCategory]
  const investmentDonutCenter = focusedInvestmentCategory
    ? {
        label: focusedInvestmentCategory.label.toUpperCase(),
        value: formatCurrency(focusedInvestmentCategory.value),
        color: focusedInvestmentCategory.color,
      }
    : {
        label: "TOTAL",
        value: formatCurrency(investmentAllocationTotal),
        color: "var(--foreground)",
      }

  const activeSeriesFor = (chart: InteractiveChartId) =>
    activeSeries?.chart === chart ? activeSeries.key : null
  const setActiveSeriesFor = (chart: InteractiveChartId, key: string | null) =>
    setActiveSeries((current) => {
      if (!key) return current?.chart === chart ? null : current
      if (current?.chart === chart && current.key === key) return current
      return { chart, key }
    })
  const seriesOpacity = (chart: InteractiveChartId, key: string) => {
    const focused = activeSeriesFor(chart)
    return focused === null || focused === key ? 1 : 0.25
  }

  return (
    <div className="reports-layout min-w-0 space-y-[clamp(1rem,3vw,1.5rem)]">
      <PageHeader title="Relatórios" subtitle={pageSubtitle} />

      <div className="border-b">
        <div className="grid min-w-0 grid-cols-4">
          {REPORT_PERIODS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPeriod(item.value)}
              className={cn(
                "min-w-0 truncate border-b-2 px-1 py-3 text-[11px] font-semibold transition-colors sm:px-3 sm:text-sm",
                period === item.value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <StatStrip items={[
        { label: "Entradas do período", value: formatCurrency(summary.income), tone: "text-success", detail: `${incomeCount} lançamentos` },
        { label: "Gastos do período", value: formatCurrency(summary.expense), tone: "text-destructive", detail: `${expenseCount} lançamentos` },
        { label: "Resultado", value: formatCurrency(summary.balance), tone: summary.balance >= 0 ? "text-success" : "text-destructive", detail: "entradas menos gastos" },
        { label: "Renda já usada", value: `${Math.round(buildMonthlyPlanning(financialProfile, transactions, goals, subscriptions, installments, limits).monthCommittedPercent)}%`, detail: `renda: ${formatCurrency(financialProfile.monthlySalary)}` },
      ]} />

      {insights.length > 0 ? (
        <section className="app-open-section flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Resumo rápido aqui. Detalhes com a Penny.
          </p>
          <Button variant="outline" asChild className="shrink-0">
            <Link href={ROUTES.assistant}>Perguntar à Penny</Link>
          </Button>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <CalendarRange className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {periodContext}
            {selectedCategoryLabel ? ` · ${selectedCategoryLabel}` : ""}
          </span>
        </div>
        <Select value={category} onValueChange={(value) => setCategory(value as CategoryId | "all")}>
          <SelectTrigger className="w-full focus-visible:border-primary sm:w-52" aria-label="Filtrar por categoria">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {CATEGORY_LIST.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!hasFinancialData ? (
        <section className="app-open-section flex flex-col items-center gap-2 py-[clamp(3rem,12vh,4rem)] text-center">
          <PieChartIcon className="h-8 w-8 text-muted-foreground/50" />
          <p className="font-semibold">{EMPTY_STATES.reports.title}</p>
          <p className="text-sm text-muted-foreground">{EMPTY_STATES.reports.description}</p>
        </section>
      ) : (
        <>
          <div className="grid min-w-0 gap-8 lg:grid-cols-2">
            <section className="flex min-w-0 flex-col gap-1 py-[clamp(1rem,3vw,1.25rem)]">
              <div className="mb-4">
                <h2 className="text-sm font-medium text-foreground">Gastos por categoria</h2>
                <p className="text-xs text-muted-foreground">Distribuição do período</p>
              </div>
              {categoryData.length === 0 ? (
                <EmptyChart icon={<PieChartIcon className="h-8 w-8" />} text={EMPTY_STATES.reportsExpenses} />
              ) : (
                <div className="app-chart-with-legend w-full items-center gap-4">
                  <ChartContainer config={categoryConfig} className="app-chart-canvas aspect-auto min-w-0 w-full">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <ChartTooltip content={<ReportsChartTooltip valueLabel="Gastos" />} />
                      <Pie
                        data={categoryData}
                        dataKey="total"
                        nameKey="label"
                        innerRadius="60%"
                        outerRadius="85%"
                        paddingAngle={2}
                        onMouseEnter={(_, index) => setActiveCategory(index)}
                        onMouseLeave={() => setActiveCategory(null)}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={entry.category}
                            fill={entry.color}
                            opacity={activeCategory === null || activeCategory === index ? 1 : 0.35}
                            stroke="transparent"
                            className="transition-opacity"
                          />
                        ))}
                      </Pie>
                      <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        pointerEvents="none"
                        style={{ fontSize: "10px", fill: "var(--muted-foreground)", letterSpacing: "0.1em" }}
                      >
                        {donutCenter.label}
                      </text>
                      <text
                        x="50%"
                        y="56%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        pointerEvents="none"
                        style={{ fontSize: "13px", fontWeight: 600, fill: donutCenter.color }}
                      >
                        {donutCenter.value}
                      </text>
                    </PieChart>
                  </ChartContainer>
                  <div className="app-chart-legend min-w-0 gap-0.5">
                    {categoryData.map((entry, index) => (
                      <button
                        key={entry.category}
                        type="button"
                        className={cn(
                          "flex min-w-0 items-center gap-2 rounded px-2 py-1 text-left transition-colors",
                          activeCategory === index ? "bg-muted/40" : "hover:bg-muted/20 focus-visible:bg-muted/20",
                        )}
                        onMouseEnter={() => setActiveCategory(index)}
                        onMouseLeave={() => setActiveCategory(null)}
                        onFocus={() => setActiveCategory(index)}
                        onBlur={() => setActiveCategory(null)}
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: entry.color }} />
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{entry.label}</span>
                        <span className="text-xs font-medium tabular-nums text-foreground">
                          {Math.round((entry.total / categoryTotal) * 100)}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="flex min-w-0 flex-col gap-1 py-[clamp(1rem,3vw,1.25rem)]">
              <div className="mb-4">
                <h2 className="text-sm font-medium text-foreground">Comparativo mensal</h2>
                <p className="text-xs text-muted-foreground">Entradas e gastos por mês</p>
              </div>
              <ReportsInlineLegend
                items={[
                  { key: "income", label: "Entradas", color: "var(--chart-3)" },
                  { key: "expense", label: "Gastos", color: "var(--chart-1)" },
                ]}
                activeKey={activeSeriesFor("monthly")}
                onActiveChange={(key) => setActiveSeriesFor("monthly", key)}
              />
              <ChartContainer config={monthlyConfig} className="h-[clamp(14rem,42vh,18rem)] w-full">
                <BarChart data={monthChartData} margin={{ left: 4, right: 4, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <ChartTooltip content={<ReportsChartTooltip visibleDataKey={activeSeriesFor("monthly")} />} cursor={{ fill: "var(--muted)", opacity: 0.2 }} />
                  <Bar
                    dataKey="income"
                    name="Entradas"
                    fill="var(--color-income)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                    opacity={seriesOpacity("monthly", "income")}
                    onMouseEnter={() => setActiveSeriesFor("monthly", "income")}
                    onMouseLeave={() => setActiveSeriesFor("monthly", null)}
                    className="transition-opacity"
                  />
                  <Bar
                    dataKey="expense"
                    name="Gastos"
                    fill="var(--color-expense)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                    opacity={seriesOpacity("monthly", "expense")}
                    onMouseEnter={() => setActiveSeriesFor("monthly", "expense")}
                    onMouseLeave={() => setActiveSeriesFor("monthly", null)}
                    className="transition-opacity"
                  />
                </BarChart>
              </ChartContainer>
            </section>

          </div>

          <div className="grid min-w-0 gap-8 lg:grid-cols-2">
            <section className="flex min-w-0 flex-col gap-1 py-[clamp(1rem,3vw,1.25rem)]">
              <div className="mb-4">
                <h2 className="text-sm font-medium text-foreground">Planejado vs realizado</h2>
                <p className="text-xs text-muted-foreground">Gastos reais e limites</p>
              </div>
              {plannedVsActual.length === 0 ? (
                <EmptyChart icon={<Activity className="h-8 w-8" />} text={EMPTY_STATES.reportsLimits} />
              ) : (
                <>
                  <ReportsInlineLegend
                    items={[
                      { key: "limit", label: "Planejado", color: "var(--chart-3)" },
                      { key: "spent", label: "Realizado", color: "var(--chart-1)" },
                    ]}
                    activeKey={activeSeriesFor("limits")}
                    onActiveChange={(key) => setActiveSeriesFor("limits", key)}
                  />
                  <ChartContainer config={limitConfig} className="h-[clamp(14rem,42vh,18rem)] w-full">
                    <BarChart data={plannedVsActual} margin={{ left: 4, right: 4, top: 8 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
                      <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={8} interval={0} tick={{ fontSize: 10 }} />
                      <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                      <ChartTooltip content={<ReportsChartTooltip visibleDataKey={activeSeriesFor("limits")} />} cursor={{ fill: "var(--muted)", opacity: 0.2 }} />
                      <Bar
                        dataKey="limit"
                        name="Planejado"
                        fill="var(--color-limit)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                        opacity={seriesOpacity("limits", "limit")}
                        onMouseEnter={() => setActiveSeriesFor("limits", "limit")}
                        onMouseLeave={() => setActiveSeriesFor("limits", null)}
                        className="transition-opacity"
                      />
                      <Bar
                        dataKey="spent"
                        name="Realizado"
                        fill="var(--color-spent)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                        opacity={seriesOpacity("limits", "spent")}
                        onMouseEnter={() => setActiveSeriesFor("limits", "spent")}
                        onMouseLeave={() => setActiveSeriesFor("limits", null)}
                        className="transition-opacity"
                      />
                    </BarChart>
                  </ChartContainer>
                </>
              )}
            </section>

            <section className="flex min-w-0 flex-col gap-1 py-[clamp(1rem,3vw,1.25rem)]">
              <div className="mb-4">
                <h2 className="text-sm font-medium text-foreground">Comparativo anual</h2>
                <p className="text-xs text-muted-foreground">Entradas, gastos e saldo por ano</p>
              </div>
              <ReportsInlineLegend
                items={[
                  { key: "income", label: "Entradas", color: "var(--chart-3)" },
                  { key: "expense", label: "Gastos", color: "var(--chart-1)" },
                  { key: "balance", label: "Saldo", color: "var(--foreground)" },
                ]}
                activeKey={activeSeriesFor("annual")}
                onActiveChange={(key) => setActiveSeriesFor("annual", key)}
              />
              <ChartContainer config={monthlyConfig} className="h-[clamp(14rem,42vh,18rem)] w-full">
                <BarChart data={annualChartData} margin={{ left: 4, right: 4, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <ChartTooltip content={<ReportsChartTooltip visibleDataKey={activeSeriesFor("annual")} />} cursor={{ fill: "var(--muted)", opacity: 0.2 }} />
                  <Bar
                    dataKey="income"
                    name="Entradas"
                    fill="var(--color-income)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                    opacity={seriesOpacity("annual", "income")}
                    onMouseEnter={() => setActiveSeriesFor("annual", "income")}
                    onMouseLeave={() => setActiveSeriesFor("annual", null)}
                    className="transition-opacity"
                  />
                  <Bar
                    dataKey="expense"
                    name="Gastos"
                    fill="var(--color-expense)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                    opacity={seriesOpacity("annual", "expense")}
                    onMouseEnter={() => setActiveSeriesFor("annual", "expense")}
                    onMouseLeave={() => setActiveSeriesFor("annual", null)}
                    className="transition-opacity"
                  />
                  <Bar
                    dataKey="balance"
                    name="Saldo"
                    fill="var(--color-balance)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                    opacity={seriesOpacity("annual", "balance")}
                    onMouseEnter={() => setActiveSeriesFor("annual", "balance")}
                    onMouseLeave={() => setActiveSeriesFor("annual", null)}
                    className="transition-opacity"
                  />
                </BarChart>
              </ChartContainer>
            </section>

            <section className="flex min-w-0 flex-col gap-1 py-[clamp(1rem,3vw,1.25rem)]">
              <div className="mb-4">
                <h2 className="text-sm font-medium text-foreground">Resumo de metas</h2>
                <p className="text-xs text-muted-foreground">Progresso das metas</p>
              </div>
              <dl className="grid h-[clamp(14rem,42vh,18rem)] content-center gap-4">
                {[
                  ["Total planejado", formatCurrency(goalStats.target)],
                  ["Valor acumulado", formatCurrency(goalStats.current)],
                  ["Progresso geral", `${goalStats.percent}%`],
                  ["Metas em risco", String(goalStats.atRisk)],
                ].map(([label, value]) => (
                  <div key={label} className="flex min-w-0 items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
                    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
                    <dd className="truncate text-right text-sm font-semibold tabular-nums text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="flex min-w-0 flex-col gap-1 py-[clamp(1rem,3vw,1.25rem)]">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-foreground">Investimentos por tipo</h2>
                  <p className="text-xs text-muted-foreground">Total investido: {formatCurrency(investmentStats.currentValue)}</p>
                </div>
                <Landmark className="h-5 w-5 text-primary" />
              </div>
              {investmentAllocation.length === 0 ? (
                <EmptyChart icon={<Landmark className="h-8 w-8" />} text="Nenhum investimento para exibir." />
              ) : (
                <div className="app-chart-with-legend w-full items-center gap-4">
                  <ChartContainer config={investmentAllocationConfig} className="app-chart-canvas aspect-auto min-w-0 w-full">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <ChartTooltip content={<ReportsChartTooltip valueLabel="Investido" />} />
                      <Pie
                        data={investmentAllocation}
                        dataKey="value"
                        nameKey="label"
                        innerRadius="60%"
                        outerRadius="85%"
                        paddingAngle={2}
                        onMouseEnter={(_, index) => setActiveInvestmentCategory(index)}
                        onMouseLeave={() => setActiveInvestmentCategory(null)}
                      >
                        {investmentAllocation.map((entry, index) => (
                          <Cell
                            key={entry.key}
                            fill={entry.color}
                            opacity={activeInvestmentCategory === null || activeInvestmentCategory === index ? 1 : 0.35}
                            stroke="transparent"
                            className="transition-opacity"
                          />
                        ))}
                      </Pie>
                      <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        pointerEvents="none"
                        style={{ fontSize: "10px", fill: "var(--muted-foreground)", letterSpacing: "0.1em" }}
                      >
                        {investmentDonutCenter.label}
                      </text>
                      <text
                        x="50%"
                        y="56%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        pointerEvents="none"
                        style={{ fontSize: "13px", fontWeight: 600, fill: investmentDonutCenter.color }}
                      >
                        {investmentDonutCenter.value}
                      </text>
                    </PieChart>
                  </ChartContainer>
                  <div className="app-chart-legend min-w-0 gap-0.5">
                    {investmentAllocation.map((entry, index) => (
                      <button
                        key={entry.key}
                        type="button"
                        className={cn(
                          "flex min-w-0 items-center gap-2 rounded px-2 py-1 text-left transition-colors",
                          activeInvestmentCategory === index
                            ? "bg-muted/40"
                            : "hover:bg-muted/20 focus-visible:bg-muted/20",
                        )}
                        onMouseEnter={() => setActiveInvestmentCategory(index)}
                        onMouseLeave={() => setActiveInvestmentCategory(null)}
                        onFocus={() => setActiveInvestmentCategory(index)}
                        onBlur={() => setActiveInvestmentCategory(null)}
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: entry.color }} />
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{entry.label}</span>
                        <span className="text-xs font-medium tabular-nums text-foreground">
                          {Math.round(entry.percent)}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="flex min-w-0 flex-col gap-1 py-[clamp(1rem,3vw,1.25rem)]">
              <div className="mb-4">
                <h2 className="text-sm font-medium text-foreground">Comparar ativos</h2>
                <p className="text-xs text-muted-foreground">Aplicado, atual e rendimento</p>
              </div>
              {investmentComparison.length === 0 ? (
                <EmptyChart icon={<Target className="h-8 w-8" />} text="Nenhum ativo para comparar." />
              ) : (
                <>
                  <ReportsInlineLegend
                    items={[
                      { key: "investedAmount", label: "Aplicado", color: "var(--chart-2)" },
                      { key: "currentValue", label: "Atual", color: "var(--chart-3)" },
                      { key: "returnAmount", label: "Rendimento", color: "var(--chart-1)" },
                    ]}
                    activeKey={activeSeriesFor("investments")}
                    onActiveChange={(key) => setActiveSeriesFor("investments", key)}
                  />
                  <ChartContainer config={investmentConfig} className="h-[clamp(14rem,42vh,18rem)] w-full">
                    <BarChart data={investmentComparison} margin={{ left: 4, right: 4, top: 8 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} interval={0} tick={{ fontSize: 10 }} />
                      <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                      <ChartTooltip content={<ReportsChartTooltip visibleDataKey={activeSeriesFor("investments")} />} cursor={{ fill: "var(--muted)", opacity: 0.2 }} />
                      <Bar
                        dataKey="investedAmount"
                        name="Aplicado"
                        fill="var(--color-investedAmount)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                        opacity={seriesOpacity("investments", "investedAmount")}
                        onMouseEnter={() => setActiveSeriesFor("investments", "investedAmount")}
                        onMouseLeave={() => setActiveSeriesFor("investments", null)}
                        className="transition-opacity"
                      />
                      <Bar
                        dataKey="currentValue"
                        name="Atual"
                        fill="var(--color-currentValue)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                        opacity={seriesOpacity("investments", "currentValue")}
                        onMouseEnter={() => setActiveSeriesFor("investments", "currentValue")}
                        onMouseLeave={() => setActiveSeriesFor("investments", null)}
                        className="transition-opacity"
                      />
                      <Bar
                        dataKey="returnAmount"
                        name="Rendimento"
                        fill="var(--color-returnAmount)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                        opacity={seriesOpacity("investments", "returnAmount")}
                        onMouseEnter={() => setActiveSeriesFor("investments", "returnAmount")}
                        onMouseLeave={() => setActiveSeriesFor("investments", null)}
                        className="transition-opacity"
                      />
                    </BarChart>
                  </ChartContainer>
                </>
              )}
            </section>

          <section className="flex min-w-0 flex-col gap-1 py-[clamp(1rem,3vw,1.25rem)]">
            <div className="mb-4">
              <h2 className="text-sm font-medium text-foreground">Evolução da carteira</h2>
              <p className="text-xs text-muted-foreground">Aplicado vs valor atual</p>
            </div>
            {investmentEvolution.every((item) => item.current === 0 && item.invested === 0) ? (
              <EmptyChart icon={<Landmark className="h-8 w-8" />} text={EMPTY_STATES.reportsPortfolio} />
            ) : (
              <>
                <ReportsInlineLegend
                  items={[
                    { key: "invested", label: "Aplicado", color: "var(--chart-2)" },
                    { key: "current", label: "Atual", color: "var(--chart-3)" },
                    { key: "returnAmount", label: "Rendimento", color: "var(--chart-1)" },
                  ]}
                  activeKey={activeSeriesFor("evolution")}
                  onActiveChange={(key) => setActiveSeriesFor("evolution", key)}
                />
                <ChartContainer config={investmentConfig} className="h-[clamp(14rem,42vh,18rem)] w-full">
                  <LineChart data={investmentEvolution} margin={{ left: 4, right: 4, top: 8 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                    <ChartTooltip content={<ReportsChartTooltip visibleDataKey={activeSeriesFor("evolution")} />} cursor={{ stroke: "var(--border)", strokeOpacity: 0.5 }} />
                    <Line
                      type="monotone"
                      dataKey="invested"
                      name="Aplicado"
                      stroke="var(--color-invested)"
                      strokeWidth={activeSeriesFor("evolution") === "invested" ? 4 : 3}
                      opacity={seriesOpacity("evolution", "invested")}
                      dot={{ r: 3 }}
                      onMouseEnter={() => setActiveSeriesFor("evolution", "invested")}
                      onMouseLeave={() => setActiveSeriesFor("evolution", null)}
                      className="transition-opacity"
                    />
                    <Line
                      type="monotone"
                      dataKey="current"
                      name="Atual"
                      stroke="var(--color-current)"
                      strokeWidth={activeSeriesFor("evolution") === "current" ? 4 : 3}
                      opacity={seriesOpacity("evolution", "current")}
                      dot={{ r: 3 }}
                      onMouseEnter={() => setActiveSeriesFor("evolution", "current")}
                      onMouseLeave={() => setActiveSeriesFor("evolution", null)}
                      className="transition-opacity"
                    />
                    <Line
                      type="monotone"
                      dataKey="returnAmount"
                      name="Rendimento"
                      stroke="var(--color-returnAmount)"
                      strokeWidth={activeSeriesFor("evolution") === "returnAmount" ? 4 : 3}
                      opacity={seriesOpacity("evolution", "returnAmount")}
                      dot={{ r: 3 }}
                      onMouseEnter={() => setActiveSeriesFor("evolution", "returnAmount")}
                      onMouseLeave={() => setActiveSeriesFor("evolution", null)}
                      className="transition-opacity"
                    />
                  </LineChart>
                </ChartContainer>
              </>
            )}
          </section>
          </div>
        </>
      )}
    </div>
  )
}

"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { InsightListRow } from "@/components/app/insight-list-row"
import { SectionHeading } from "@/components/app/section-heading"
import { AnimatedSection } from "@/components/motion/animated-section"
import { TransactionItem } from "@/components/app/transaction-item"
import { goalProgressTone, Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { formatCurrency } from "@/lib/format"
import { getCategory } from "@/lib/categories"
import { buildMonthlyPlanning, upcomingSubscriptions } from "@/lib/planning"
import { ROUTES } from "@/lib/routes"
import { goalProgress, limitUsage } from "@/lib/selectors"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { EditIncomeDialog } from "@/components/app/edit-income-dialog"
import { Button } from "@/components/ui/button"
import { scaleIn } from "@/src/lib/animations"
import { buildDashboardSuggestions } from "@/lib/ui-suggestions"
import { AlertTriangle, ArrowRight, ChevronDown, Eye, EyeOff, Pencil, Sparkles, Target } from "lucide-react"

function monthCommitmentHistory(
  profile: ReturnType<typeof useStore>["financialProfile"],
  transactions: ReturnType<typeof useStore>["transactions"],
  goals: ReturnType<typeof useStore>["goals"],
  subscriptions: ReturnType<typeof useStore>["subscriptions"],
  installments: ReturnType<typeof useStore>["installments"],
  limits: ReturnType<typeof useStore>["limits"],
  months = 6,
) {
 const options = []
 const now = new Date()
 for (let i = months - 1; i >= 0; i--) {
  const ref = new Date(now.getFullYear(), now.getMonth() - i, 1)
  const planning = buildMonthlyPlanning(profile, transactions, goals, subscriptions, installments, limits, ref)
  options.push({
   key: `${ref.getFullYear()}-${ref.getMonth()}`,
   label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(ref).replace(".", ""),
   fullLabel: new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(ref).replace(".", ""),
   percent: planning.monthCommittedPercent,
   safeToSpend: planning.safeToSpend,
  })
 }
 return options
}

export default function DashboardPage() {
 const { financialProfile, transactions, goals, limits, subscriptions, installments, userCategories, hiddenSystemCategories } = useStore()
 const [balanceVisible, setBalanceVisible] = useState(true)
 const [incomeDialogOpen, setIncomeDialogOpen] = useState(false)
 const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
 const [detailsOpen, setDetailsOpen] = useState(false)

 const monthHistory = useMemo(
  () => monthCommitmentHistory(financialProfile, transactions, goals, subscriptions, installments, limits, 6),
  [financialProfile, transactions, goals, subscriptions, installments, limits],
 )

 const activeMonth = monthHistory.find((month) => month.key === selectedMonth) ?? monthHistory.at(-1)

 const activeMonthRef = useMemo(() => {
  const key = activeMonth?.key
  if (!key) return new Date()
  const [year, month] = key.split("-").map(Number)
  return new Date(year, month, 1)
 }, [activeMonth?.key])

 const activePlanning = useMemo(
  () => buildMonthlyPlanning(financialProfile, transactions, goals, subscriptions, installments, limits, activeMonthRef),
  [financialProfile, transactions, goals, subscriptions, installments, limits, activeMonthRef],
 )

 const displayValue = activePlanning.safeToSpend
 const maxPercent = Math.max(...monthHistory.map((item) => item.percent), 1)

 const limitAlerts = limitUsage(limits, transactions).filter((item) => item.status !== "healthy")
 const goalAlerts = goals.map((goal) => ({ goal, progress: goalProgress(goal) })).filter((item) => item.progress.atRisk)
 const upcoming = upcomingSubscriptions(subscriptions, 7)
 const pendingReview = transactions.filter((tx) => tx.needsReview || tx.category === "nao-categorizado").length
 const recentTransactions = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
 const upcomingGoals = goals
  .map((goal) => ({ goal, progress: goalProgress(goal) }))
  .filter(({ progress }) => !progress.completed && progress.daysLeft >= 0)
  .sort((a, b) => new Date(a.goal.deadline).getTime() - new Date(b.goal.deadline).getTime())
  .slice(0, 3)

 const suggestions = useMemo(
  () =>
   pendingReview > 0
    ? []
    : buildDashboardSuggestions(
       transactions,
       financialProfile,
       goals,
       limits,
       subscriptions,
       installments,
       userCategories,
       hiddenSystemCategories,
      ),
  [transactions, financialProfile, goals, limits, subscriptions, installments, userCategories, hiddenSystemCategories, pendingReview],
 )

 const topAlert = useMemo(() => {
  if (pendingReview > 0) {
   return {
    href: ROUTES.transactions,
    title: "Revisar lançamentos",
    subtitle: `${pendingReview} movimentação(ões) aguardando confirmação`,
   }
  }
  if (limitAlerts.length > 0) {
   const item = limitAlerts[0]
   return {
    href: ROUTES.limits,
    title: `Orçamento de ${getCategory(item.limit.category).label}`,
    subtitle: `${Math.round(item.percent)}% utilizado`,
   }
  }
  if (goalAlerts.length > 0) {
   const { goal, progress } = goalAlerts[0]
   return {
    href: ROUTES.goals,
    title: `Meta em risco: ${goal.name}`,
    subtitle: `${progress.percent}% concluída`,
   }
  }
  if (upcoming.length > 0) {
   return {
    href: ROUTES.transactions,
    title: "Assinaturas nos próximos 7 dias",
    subtitle: `${upcoming.length} cobrança(s) prevista(s)`,
   }
  }
  return null
 }, [pendingReview, limitAlerts, goalAlerts, upcoming])

 const heroMetrics = [
  {
   label: "Entradas",
   value: formatCurrency(activePlanning.receivedIncome),
   detail: activePlanning.extraIncomeDetected > 0
    ? `Salário ${formatCurrency(activePlanning.declaredSalary)} + extra ${formatCurrency(activePlanning.extraIncomeDetected)}`
    : `Salário ${formatCurrency(activePlanning.declaredSalary)}`,
   tone: "text-emerald-300",
  },
  { label: "Despesas", value: formatCurrency(activePlanning.confirmedExpenses), detail: "confirmadas no mês", tone: "text-red-300" },
  {
   label: "Comprometido",
   value: `${Math.round(activePlanning.monthCommittedPercent)}%`,
   detail: `${formatCurrency(activePlanning.receivedIncome)} entraram · ${formatCurrency(activePlanning.committedMoney)} comprometidos`,
  },
  { label: "Economia prevista", value: formatCurrency(activePlanning.projectedSavings), detail: `Reserva: ${formatCurrency(activePlanning.monthlyReserve)}`, tone: activePlanning.projectedSavings >= 0 ? "text-emerald-300" : "text-red-300" },
 ]

 return (
  <div className="-mt-16 min-w-0 space-y-[clamp(1.5rem,4vw,2.5rem)] pt-20 md:mt-0 md:pt-0">
   <section className="space-y-5">
    <AnimatedSection as="div" className="md:hidden">
     <h1 className="flex min-h-10 items-center text-2xl font-extrabold tracking-tight text-balance">Visão geral</h1>
    </AnimatedSection>

    {topAlert ? (
     <AnimatedSection as="div" delay={0.02}>
      <InsightListRow
       href={topAlert.href}
       accent="primary"
       icon={
        <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
         <AlertTriangle className="h-5 w-5" />
        </span>
       }
       title={topAlert.title}
       subtitle={topAlert.subtitle}
      />
     </AnimatedSection>
    ) : null}

    <AnimatedSection
     as="div"
     variants={scaleIn}
     delay={0.04}
     className="flex min-h-[clamp(12rem,34svh,15rem)] min-w-0 flex-col overflow-hidden rounded-[clamp(1rem,3vw,1.5rem)] bg-[#194b36] p-[clamp(1rem,3vw,1.5rem)] text-white dark:bg-[#143a2b]"
    >
     <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
       <p className="text-xl font-extrabold leading-none tracking-tight text-white sm:text-2xl">
        Disponível para gastar
       </p>
       <p className="mt-2 text-xs font-bold uppercase tracking-wide text-white/45">
        Entrou no mês: {formatCurrency(activePlanning.receivedIncome)}
        {activePlanning.monthlyIncome > activePlanning.receivedIncome
          ? ` · previsto ${formatCurrency(activePlanning.monthlyIncome)}`
          : ""}
       </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
       <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 rounded-xl bg-white/10 px-2.5 text-xs font-semibold text-white hover:bg-white/15 hover:text-white"
        onClick={() => setIncomeDialogOpen(true)}
       >
        <Pencil className="h-3.5 w-3.5" />
        Editar renda
       </Button>
       <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white/70 outline-none transition-colors hover:bg-white/15 focus-visible:ring-[3px] focus-visible:ring-white/25"
        aria-label={balanceVisible ? "Ocultar valores" : "Mostrar valores"}
        onClick={() => setBalanceVisible((visible) => !visible)}
       >
        {balanceVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
       </button>
      </div>
     </div>

     <div className="flex flex-1 items-center py-4">
      <div className="min-w-0">
       {balanceVisible ? (
        <p className="max-w-full text-[clamp(2.5rem,12vw,4.75rem)] font-extrabold leading-none tracking-tight tabular-nums">
         {formatCurrency(displayValue)}
        </p>
       ) : (
        <div className="flex h-[clamp(3rem,12vw,4.75rem)] items-center gap-[clamp(0.375rem,2vw,0.625rem)]" aria-label="Valor oculto">
         {Array.from({ length: 8 }).map((_, index) => (
          <span key={index} className="size-[clamp(0.75rem,3vw,1rem)] rounded-2xl bg-white" />
         ))}
        </div>
       )}
       <p className="mt-2 text-sm font-medium text-white/55">
        Ainda deve sobrar {formatCurrency(activePlanning.projectedSavings)}.
       </p>
      </div>
     </div>

     <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
      <CollapsibleTrigger asChild>
       <button
        type="button"
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2.5 text-xs font-semibold text-white/80 hover:bg-white/15 hover:text-white"
       >
        Ver detalhes
        <ChevronDown className={cn("h-4 w-4 transition-transform", detailsOpen && "rotate-180")} />
       </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
       <div className="md:hidden">
        <Select value={activeMonth?.key} onValueChange={(value) => setSelectedMonth(value)}>
         <SelectTrigger
          className="h-11 w-full rounded-2xl border-white/20 bg-white/10 text-sm font-semibold text-white hover:bg-white/15 [&_svg]:text-white/70"
          aria-label="Selecionar mês"
         >
          <SelectValue>{activeMonth?.fullLabel ?? "Mês atual"}</SelectValue>
         </SelectTrigger>
         <SelectContent>
          {monthHistory.map((item) => (
           <SelectItem key={item.key} value={item.key}>
            {item.fullLabel}
           </SelectItem>
          ))}
         </SelectContent>
        </Select>
       </div>
       <div className="hidden h-20 grid-cols-6 items-end gap-3 md:grid">
        {monthHistory.map((item) => {
         const selected = item.key === activeMonth?.key
         const height = 20 + (item.percent / maxPercent) * 28
         return (
          <button
           key={item.key}
           type="button"
           className="group flex h-full min-w-0 flex-col justify-end gap-2 rounded-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-white/25"
           aria-pressed={selected}
           onClick={() => setSelectedMonth(item.key)}
          >
           <div
            className={cn("w-full rounded-2xl transition-colors", selected ? "bg-white/75" : "bg-white/25 group-hover:bg-white/40")}
            style={{ height: `${height}px` }}
           />
           <span className={cn("truncate text-center text-[11px] font-semibold", selected ? "text-white" : "text-white/52")}>
            {item.label}
           </span>
          </button>
         )
        })}
       </div>
       <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/15 pt-4 sm:grid-cols-4">
        {heroMetrics.map((metric) => (
         <div key={metric.label} className="min-w-0">
          <dt className="truncate text-[9px] font-bold uppercase tracking-[0.12em] text-white/55 sm:text-[10px]">{metric.label}</dt>
          <dd className={cn("mt-1 truncate text-base font-extrabold leading-none tabular-nums text-white sm:text-lg", metric.tone)}>{metric.value}</dd>
          <p className="mt-1 truncate text-[10px] leading-4 text-white/55">{metric.detail}</p>
         </div>
        ))}
       </dl>
      </CollapsibleContent>
     </Collapsible>
    </AnimatedSection>
   </section>

   {suggestions.length > 0 ? (
    <section className="flex min-w-0 flex-col">
     <SectionHeading
      eyebrow="Dica"
      title="Sugestão do mês"
      action={<Link href={ROUTES.assistant} className="text-sm font-bold text-primary hover:underline">Perguntar à P.E.N.N.Y.</Link>}
     />
     <div className="app-list-section border-t">
      <div className="flex min-h-[5.5rem] items-start gap-3 px-1 py-3.5">
       <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-4 w-4" />
       </span>
       <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{suggestions[0].title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{suggestions[0].hint}</p>
       </div>
      </div>
     </div>
    </section>
   ) : null}

   <div className={cn("grid min-w-0 items-stretch gap-8", upcomingGoals.length > 0 && "lg:grid-cols-2")}>
    {upcomingGoals.length > 0 ? (
     <section className="flex min-w-0 flex-col">
      <SectionHeading
       eyebrow="Objetivos"
       title="Metas mais próximas"
       action={<Link href={ROUTES.goals} className="text-sm font-bold text-primary hover:underline">Ver metas</Link>}
      />
      <div className="app-list-section flex-1 border-t">
       <ul className="grid h-full divide-y" style={{ gridTemplateRows: `repeat(${upcomingGoals.length}, minmax(0, 1fr))` }}>
        {upcomingGoals.map(({ goal, progress }) => (
         <li key={goal.id} className="min-h-0">
          <Link href={ROUTES.goals} className="app-row-hover grid h-full min-h-[5.25rem] min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-1 py-4">
           <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Target className="h-5 w-5" /></span>
           <div className="min-w-0">
            <div className="flex justify-between gap-3"><p className="truncate text-sm font-bold">{goal.name}</p><span className="text-xs font-bold tabular-nums">{progress.percent}%</span></div>
            <Progress value={progress.percent} aria-label={`${progress.percent}% concluído`} className={cn("mt-2 h-2", goalProgressTone(progress))} />
            <p className="mt-2 truncate text-xs text-muted-foreground">Faltam {formatCurrency(progress.remaining)} · {progress.estimate}</p>
           </div>
           <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
         </li>
        ))}
       </ul>
      </div>
     </section>
    ) : null}

    {recentTransactions.length > 0 ? (
     <section className="flex min-w-0 flex-col">
      <SectionHeading
       eyebrow="Movimentações"
       title="Últimos lançamentos"
       action={<Link href={ROUTES.transactions} className="text-sm font-bold text-primary hover:underline">Ver todas</Link>}
      />
      <div className="app-list-section flex-1 border-t">
       <ul className="grid h-full divide-y" style={{ gridTemplateRows: `repeat(${recentTransactions.length}, minmax(0, 1fr))` }}>
        {recentTransactions.map((tx) => (
         <li key={tx.id} className="app-row-hover min-h-0 px-1 [&>*]:h-full [&>*>*]:h-full">
          <TransactionItem tx={tx} />
         </li>
        ))}
       </ul>
      </div>
     </section>
    ) : null}
   </div>

   <EditIncomeDialog open={incomeDialogOpen} onOpenChange={setIncomeDialogOpen} />
  </div>
 )
}
"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { InsightListRow } from "@/components/app/insight-list-row"
import { SectionHeading } from "@/components/app/section-heading"
import { AnimatedSection } from "@/components/motion/animated-section"
import { TransactionItem } from "@/components/app/transaction-item"
import { goalProgressTone, Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { AlertTriangle, ArrowRight, Eye, EyeOff, Pencil, Sparkles, Target } from "lucide-react"

function greeting() {
 const h = new Date().getHours()
 if (h < 12) return "Bom dia"
 if (h < 18) return "Boa tarde"
 return "Boa noite"
}

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
 const { user, financialProfile, transactions, goals, limits, subscriptions, installments, notifications, userCategories, hiddenSystemCategories } = useStore()
 const [balanceVisible, setBalanceVisible] = useState(true)
 const [incomeDialogOpen, setIncomeDialogOpen] = useState(false)
 const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
 const firstName = user?.name.split(" ")[0] ?? ""

 const planning = useMemo(
  () => buildMonthlyPlanning(financialProfile, transactions, goals, subscriptions, installments, limits),
  [financialProfile, transactions, goals, subscriptions, installments, limits],
 )

 const monthHistory = useMemo(
  () => monthCommitmentHistory(financialProfile, transactions, goals, subscriptions, installments, limits, 6),
  [financialProfile, transactions, goals, subscriptions, installments, limits],
 )

 const activeMonth = monthHistory.find((month) => month.key === selectedMonth) ?? monthHistory.at(-1)
 const currentMonth = monthHistory.at(-1)
 const isCurrentMonth = activeMonth?.key === currentMonth?.key
 const displayValue = isCurrentMonth ? planning.safeToSpend : activeMonth?.safeToSpend ?? 0
 const maxPercent = Math.max(...monthHistory.map((item) => item.percent), 1)

 const limitAlerts = limitUsage(limits, transactions).filter((item) => item.status !== "healthy")
 const goalAlerts = goals.map((goal) => ({ goal, progress: goalProgress(goal) })).filter((item) => item.progress.atRisk)
 const upcoming = upcomingSubscriptions(subscriptions, 7)
 const upcomingGoals = goals
  .map((goal) => ({ goal, progress: goalProgress(goal) }))
  .filter(({ progress }) => !progress.completed && progress.daysLeft >= 0)
  .sort((a, b) => new Date(a.goal.deadline).getTime() - new Date(b.goal.deadline).getTime())
  .slice(0, 3)
 const recentTransactions = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
 const pendingReview = transactions.filter((tx) => tx.needsReview || tx.category === "nao-categorizado").length
 const alertCount = limitAlerts.length + goalAlerts.length + (upcoming.length > 0 ? 1 : 0) + (pendingReview > 0 ? 1 : 0)
 const agoraListCount = alertCount
 const unreadNotifications = notifications.filter((n) => !n.read).length
 const agoraSubtitle =
  unreadNotifications > agoraListCount
   ? `${agoraListCount} ${agoraListCount === 1 ? "item precisa" : "itens precisam"} de ação agora · ${unreadNotifications} notificações no total`
   : "Pontos do seu mês que valem uma olhada"

 const suggestions = useMemo(
  () => buildDashboardSuggestions(transactions, financialProfile, goals, limits, subscriptions, installments, userCategories, hiddenSystemCategories),
  [transactions, financialProfile, goals, limits, subscriptions, installments, userCategories, hiddenSystemCategories],
 )

 const heroMetrics = [
  {
   label: "Entradas",
   value: formatCurrency(planning.receivedIncome),
   detail: planning.extraIncomeDetected > 0
    ? `Salário ${formatCurrency(planning.declaredSalary)} + extra ${formatCurrency(planning.extraIncomeDetected)}`
    : `Salário ${formatCurrency(planning.declaredSalary)}`,
   tone: "text-emerald-300",
  },
  { label: "Despesas", value: formatCurrency(planning.confirmedExpenses), detail: "confirmadas no mês", tone: "text-red-300" },
  { label: "Comprometido", value: `${Math.round(planning.monthCommittedPercent)}%`, detail: `Orçamentos: ${Math.round(planning.salaryUsedPercent)}% usados` },
  { label: "Economia prevista", value: formatCurrency(planning.projectedSavings), detail: `Reserva: ${formatCurrency(planning.monthlyReserve)}`, tone: planning.projectedSavings >= 0 ? "text-emerald-300" : "text-red-300" },
 ]

 return (
  <div className="-mt-16 min-w-0 space-y-[clamp(1.5rem,4vw,2.5rem)] pt-20 md:mt-0 md:pt-0">
   <section className="space-y-5">
    <AnimatedSection as="div" className="md:hidden"><h1 className="flex min-h-10 items-center text-2xl font-extrabold tracking-tight text-balance">Visão geral</h1></AnimatedSection>
    <AnimatedSection as="div" className="hidden"><p className="text-base font-medium leading-none text-muted-foreground sm:text-lg">{greeting()},</p><h1 className="mt-1 text-[clamp(2.35rem,4vw,4rem)] font-extrabold leading-[0.95] tracking-tight text-foreground">{firstName || "PoupaByte"}</h1></AnimatedSection>

    <div className={cn("grid min-w-0 gap-[clamp(1rem,3vw,1.25rem)]", alertCount > 0 && "xl:grid-cols-[minmax(0,1.75fr)_minmax(min(100%,340px),0.95fr)] xl:items-stretch")}>
    <AnimatedSection
     as="div"
     variants={scaleIn}
     delay={0.04}
     className="flex h-full min-h-[clamp(15rem,42svh,17rem)] min-w-0 flex-col overflow-hidden rounded-[clamp(1rem,3vw,1.5rem)] bg-[#194b36] p-[clamp(1rem,3vw,1.5rem)] text-white dark:bg-[#143a2b]"
    >
     <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
       <p className="text-xl font-extrabold leading-none tracking-tight text-white sm:text-2xl">
        {isCurrentMonth ? "Disponível para gastar" : "Planejamento do mês"}
       </p>
       <p className="mt-2 text-xs font-bold uppercase tracking-wide text-white/45">
        {isCurrentMonth
          ? `Renda cadastrada: ${formatCurrency(planning.declaredSalary)}`
          : activeMonth ? `${activeMonth.label}` : "Mês atual"}
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
       <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white/70 outline-none transition-colors hover:bg-white/15 focus-visible:ring-[3px] focus-visible:ring-white/25" aria-label={balanceVisible ? "Ocultar valores" : "Mostrar valores"} title={balanceVisible ? "Ocultar valores" : "Mostrar valores"} onClick={() => setBalanceVisible((visible) => !visible)}>
        {balanceVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
       </button>
      </div>
     </div>
     <div className="flex flex-1 items-center py-3 sm:py-4">
      <div className="min-w-0">
       {balanceVisible ? (
        <p className="max-w-full text-[clamp(2.25rem,11vw,4.75rem)] font-extrabold leading-none tracking-tight tabular-nums">{formatCurrency(displayValue)}</p>
       ) : (
        <div className="flex h-[clamp(3rem,12vw,4.75rem)] items-center gap-[clamp(0.375rem,2vw,0.625rem)]" aria-label="Valor oculto">
         {Array.from({ length: 8 }).map((_, index) => <span key={index} className="size-[clamp(0.75rem,3vw,1rem)] rounded-2xl bg-white" />)}
        </div>
       )}
       <p className="mt-2 text-sm font-medium text-white/55">
        {isCurrentMonth
          ? `Ainda deve sobrar ${formatCurrency(planning.projectedSavings)}.`
          : "Histórico de comprometimento mensal"}
       </p>
      </div>
     </div>
     <div className="md:hidden">
      <Select
       value={activeMonth?.key}
       onValueChange={(value) => setSelectedMonth(value)}
      >
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
     <div className="hidden h-[4.5rem] grid-cols-6 items-end gap-2 sm:h-20 sm:gap-3 md:grid">
      {monthHistory.map((item) => {
       const selected = item.key === activeMonth?.key
       const height = 20 + (item.percent / maxPercent) * 28
       return (
        <button key={item.key} type="button" className="group flex h-full min-w-0 flex-col justify-end gap-2 rounded-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-white/25" aria-pressed={selected} onClick={() => setSelectedMonth(item.key)}>
         <div className={cn("w-full rounded-2xl transition-colors", selected ? "bg-white/75" : "bg-white/25 group-hover:bg-white/40")} style={{ height: `${height}px` }} />
         <span className={cn("truncate text-center text-[11px] font-semibold", selected ? "text-white" : "text-white/52")}>{item.label}</span>
        </button>
       )
      })}
     </div>
     {isCurrentMonth ? (
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/15 pt-3 sm:grid-cols-4">
       {heroMetrics.map((metric) => (
        <div key={metric.label} className="min-w-0">
         <dt className="truncate text-[9px] font-bold uppercase tracking-[0.12em] text-white/55 sm:text-[10px]">{metric.label}</dt>
         <dd className={cn("mt-1 truncate text-base font-extrabold leading-none tabular-nums text-white sm:text-lg", metric.tone)}>{metric.value}</dd>
         <p className="mt-1 truncate text-[10px] leading-4 text-white/55">{metric.detail}</p>
        </div>
       ))}
      </dl>
     ) : null}
    </AnimatedSection>
    {alertCount > 0 ? <section className="flex h-full min-h-[clamp(15rem,42svh,17rem)] min-w-0 flex-col">
      <div className="app-list-section flex h-full min-h-0 flex-1 flex-col border-t">
       <SectionHeading
        className="mb-0 shrink-0 border-b border-border/80 px-1 pb-3 pt-1"
        eyebrow="Agora"
        title="O que precisa de atenção"
        subtitle={agoraSubtitle}
        action={agoraListCount > 0 ? <span className="text-sm font-semibold text-muted-foreground">{agoraListCount}</span> : null}
       />
       <ul
        className="grid min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain"
        style={{ gridTemplateRows: `repeat(${alertCount}, minmax(0, 1fr))` }}
       >
         {upcoming.length > 0 ? (
          <li className="min-h-0">
           <InsightListRow
            accent="primary"
            icon={<span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><AlertTriangle className="h-5 w-5" /></span>}
            title="Assinaturas nos próximos 7 dias"
            subtitle={`${upcoming.length} cobrança(s) prevista(s)`}
            showArrow={false}
           />
          </li>
         ) : null}
         {limitAlerts.map((item) => (
          <li key={item.limit.id} className="min-h-0">
           <InsightListRow
            href={ROUTES.limits}
            accent={item.status === "exceeded" ? "destructive" : "primary"}
            icon={<span className="flex size-10 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><AlertTriangle className="h-5 w-5" /></span>}
            title={`Orçamento de ${getCategory(item.limit.category).label}`}
            subtitle={`${Math.round(item.percent)}% utilizado`}
           />
          </li>
         ))}
         {goalAlerts.map(({ goal, progress }) => (
          <li key={goal.id} className="min-h-0">
           <InsightListRow
            href={ROUTES.goals}
            accent="primary"
            icon={<span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Target className="h-5 w-5" /></span>}
            title={`Meta em risco: ${goal.name}`}
            subtitle={`${progress.percent}% concluída · ${progress.estimate}`}
           />
          </li>
         ))}
         {pendingReview > 0 ? (
          <li className="min-h-0">
           <InsightListRow
            href={ROUTES.transactions}
            accent="primary"
            icon={<span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><AlertTriangle className="h-5 w-5" /></span>}
            title="Movimentações para revisar"
            subtitle={`${pendingReview} lançamento(s) sem confirmação`}
           />
          </li>
         ) : null}
       </ul>
      </div>
    </section> : null}
    </div>
   </section>

   {suggestions.length > 0 ? (
    <section className="flex min-w-0 flex-col">
     <SectionHeading
      eyebrow="Dicas"
      title="Sugestões"
      subtitle="Leituras rápidas do seu mês"
      action={<Link href={ROUTES.assistant} className="text-sm font-bold text-primary hover:underline">Perguntar à P.E.N.N.Y.</Link>}
     />
     <div className="app-list-section border-t">
      <ul
       className={cn(
        "divide-y",
        suggestions.length > 3 && "max-h-[calc(3*5.5rem)] overflow-y-auto overscroll-contain",
       )}
      >
       {suggestions.map((item) => (
        <li key={item.id} className="flex min-h-[5.5rem] items-start gap-3 px-1 py-3.5">
         <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
         </span>
         <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{item.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>
          {item.long ? (
           <Link href={ROUTES.assistant} className="mt-1 inline-block text-xs font-semibold text-primary hover:underline">
            Ver detalhes com a P.E.N.N.Y.
           </Link>
          ) : null}
         </div>
        </li>
       ))}
      </ul>
     </div>
    </section>
   ) : null}

   <div className={cn("grid min-w-0 items-stretch gap-8", upcomingGoals.length > 0 && "lg:grid-cols-2")}>
    {upcomingGoals.length > 0 ? (
     <section className="flex min-w-0 flex-col">
      <SectionHeading eyebrow="Objetivos" title="Metas mais próximas" subtitle="Até três objetivos ordenados pelo prazo" action={<Link href={ROUTES.goals} className="text-sm font-bold text-primary hover:underline">Ver metas</Link>} />
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

    <section className="flex min-w-0 flex-col">
     <SectionHeading eyebrow="Movimentações" title="Últimos lançamentos" subtitle="Gastos e receitas organizados por categoria" action={<Link href={ROUTES.transactions} className="text-sm font-bold text-primary hover:underline">Ver todas</Link>} />
     <div className="app-list-section flex-1 border-t">{recentTransactions.length > 0 ? <ul className="grid h-full divide-y" style={{ gridTemplateRows: `repeat(${recentTransactions.length}, minmax(0, 1fr))` }}>{recentTransactions.map((tx) => <li key={tx.id} className="app-row-hover min-h-0 px-1 [&>*]:h-full [&>*>*]:h-full"><TransactionItem tx={tx} /></li>)}</ul> : <p className="py-6 text-sm text-muted-foreground">Nenhum lançamento ainda</p>}</div>
    </section>
   </div>

   <EditIncomeDialog open={incomeDialogOpen} onOpenChange={setIncomeDialogOpen} />
  </div>
 )
}

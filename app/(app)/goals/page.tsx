"use client"

import { useMemo, useState, type FormEvent, type ReactNode } from "react"
import { PageHeader } from "@/components/app/page-header"
import { StatStrip } from "@/components/app/stat-strip"
import { StatusBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { CurrencyInput, formatCurrencyInput } from "@/components/ui/currency-input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { goalProgressTone, Progress } from "@/components/ui/progress"
import { formatCurrency, relativeDeadline } from "@/lib/format"
import { parseAmountInput } from "@/lib/finance"
import { goalViabilityMessage } from "@/lib/insights"
import { shortGoalViabilityMessage } from "@/lib/ui-suggestions"
import { goalProgress, goalSummary } from "@/lib/selectors"
import { useStore } from "@/lib/store"
import type { Goal } from "@/lib/types"
import { cn } from "@/lib/utils"
import { AlertTriangle, CalendarDays, CheckCircle2, Pencil, Plus, Target, Trash2 } from "lucide-react"
import { ActionSheet } from "@/components/app/action-sheet"
import { useLongPress } from "@/hooks/use-long-press"
import { useRipple } from "@/hooks/use-ripple"

function GoalDialog({ goal, trigger }: { goal?: Goal; trigger: ReactNode }) {
 const { addGoal, updateGoal, notify } = useStore()
 const [open, setOpen] = useState(false)
 const [name, setName] = useState("")
 const [target, setTarget] = useState("")
 const [current, setCurrent] = useState("")
 const [deadline, setDeadline] = useState("")

 function onOpenChange(next: boolean) {
  if (next) { setName(goal?.name ?? ""); setTarget(goal ? formatCurrencyInput(goal.target) : ""); setCurrent(goal ? formatCurrencyInput(goal.current) : ""); setDeadline(goal?.deadline.slice(0, 10) ?? new Date().toISOString().slice(0, 10)) }
  setOpen(next)
 }
 function submit(event: FormEvent) {
  event.preventDefault()
  const targetValue = parseAmountInput(target); const currentValue = current ? parseAmountInput(current) : 0
  if (!name.trim() || targetValue <= 0 || currentValue < 0 || !deadline) { notify({ kind: "error", type: "error", title: "Meta inválida", message: "Preencha os dados da meta corretamente." }); return }
  const payload = { name: name.trim(), target: targetValue, current: currentValue, deadline: new Date(`${deadline}T12:00:00`).toISOString(), color: goal?.color ?? "#c72c3b" }
  if (goal) updateGoal({ ...payload, id: goal.id }); else addGoal(payload)
  setOpen(false)
 }
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent><DialogHeader><DialogTitle>{goal ? "Editar meta" : "Nova meta"}</DialogTitle><DialogDescription>Defina o objetivo, o valor atual e o prazo.</DialogDescription></DialogHeader><form onSubmit={submit}><div className="space-y-4 px-6 py-5"><div className="space-y-1.5"><Label htmlFor="goal-name">Nome</Label><Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Viagem para o Chile" /></div><div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="goal-target">Objetivo</Label><CurrencyInput id="goal-target" value={target} onChange={setTarget} /></div><div className="space-y-1.5"><Label htmlFor="goal-current">Valor atual</Label><CurrencyInput id="goal-current" value={current} onChange={setCurrent} /></div></div><div className="space-y-1.5"><Label htmlFor="goal-deadline">Prazo</Label><Input id="goal-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div></div><DialogFooter><Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" size="lg" className="flex-1">Salvar meta</Button></DialogFooter></form></DialogContent></Dialog>
}

function GoalRow({ goal }: { goal: Goal }) {
 const { deleteGoal, financialProfile, transactions, subscriptions, installments, limits } = useStore()
 const viability = useMemo(
  () => goalViabilityMessage(goal, financialProfile, transactions, subscriptions, installments, limits),
  [goal, financialProfile, transactions, subscriptions, installments, limits],
 )
 const [actionsOpen, setActionsOpen] = useState(false)
 const progress = goalProgress(goal)
 const tone = goalProgressTone(progress)
 const longPress = useLongPress<HTMLDivElement>(() => setActionsOpen(true))
 const createRipple = useRipple<HTMLDivElement>()
 return (
  <>
   <div className="app-ripple-surface app-row-hover px-1 py-5" {...longPress} onPointerDown={(event) => { createRipple(event); longPress.onPointerDown(event) }}>
    <div className="flex items-start gap-3">
     <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", progress.completed ? "bg-success/10 text-success" : progress.atRisk ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
      {progress.completed ? <CheckCircle2 className="h-5 w-5" /> : progress.atRisk ? <AlertTriangle className="h-5 w-5" /> : <Target className="h-5 w-5" />}
     </span>
     <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
       <div className="min-w-0">
        <h2 className="truncate text-sm font-bold sm:text-base">{goal.name}</h2>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{relativeDeadline(goal.deadline)}</p>
       </div>
       <div className="shrink-0 text-right">
        <p className="font-extrabold tabular-nums">{progress.percent}%</p>
        <p className="mt-1 text-xs text-muted-foreground">faltam {formatCurrency(progress.remaining)}</p>
       </div>
      </div>
      <Progress value={progress.percent} aria-label={`${progress.percent}% concluído`} className={cn("mt-4 h-2.5", tone)} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
       <p className="text-xs text-muted-foreground">{formatCurrency(goal.current)} de {formatCurrency(goal.target)} · {progress.estimate}</p>
       <StatusBadge tone={progress.completed ? "success" : progress.atRisk ? "danger" : "neutral"}>
        {progress.completed ? "Concluído" : progress.atRisk ? "Prazo em risco" : "No ritmo"}
       </StatusBadge>
      </div>
      <p className="mt-2 text-xs font-medium text-foreground/80">{shortGoalViabilityMessage(viability)}</p>
      <div className="mt-3 flex justify-end">
       <GoalDialog goal={goal} trigger={<Button variant="ghost" size="icon" aria-label="Editar objetivo"><Pencil className="h-4 w-4" /></Button>} />
       <Button variant="ghost" size="icon" className="text-destructive" aria-label="Excluir objetivo" onClick={() => deleteGoal(goal.id)}><Trash2 className="h-4 w-4" /></Button>
      </div>
     </div>
    </div>
   </div>
   <ActionSheet open={actionsOpen} onOpenChange={setActionsOpen} title={goal.name}>
    <GoalDialog goal={goal} trigger={<Button variant="ghost" className="h-12 w-full justify-start rounded-xl px-3" onClick={() => setActionsOpen(false)}><Pencil className="h-4 w-4" />Editar</Button>} />
    <Button variant="ghost" className="h-12 w-full justify-start rounded-xl px-3 text-destructive hover:text-destructive" onClick={() => { setActionsOpen(false); deleteGoal(goal.id) }}><Trash2 className="h-4 w-4" />Excluir</Button>
   </ActionSheet>
  </>
 )
}

export default function GoalsPage() {
 const { goals, financialProfile } = useStore(); const totals = goalSummary(goals)
 return <div className="min-w-0 space-y-[clamp(1rem,3vw,1.5rem)]"><PageHeader title="Objetivos" subtitle="Metas conectadas à sua renda mensal." action={<GoalDialog trigger={<Button><Plus className="h-4 w-4" />Novo objetivo</Button>} />} /><StatStrip items={[{ label: "Total guardado", value: formatCurrency(totals.current), detail: `de ${formatCurrency(totals.target)}` }, { label: "Progresso geral", value: `${totals.percent}%`, detail: `${totals.completed} de ${goals.length} concluídas`, tone: totals.percent >= 50 ? "text-success" : "text-primary" }, { label: "Em risco", value: totals.atRisk, detail: `${totals.nearDeadline} próximas do prazo`, tone: totals.atRisk ? "text-destructive" : "text-success" }]} />{goals.length ? <div className="app-list-section divide-y divide-border border-t">{goals.map((goal) => <GoalRow key={goal.id} goal={goal} />)}</div> : <div className="app-open-section py-14 text-center"><Target className="mx-auto h-8 w-8 text-muted-foreground/50" /><p className="mt-3 font-semibold">Nenhuma meta cadastrada</p><p className="mt-1 text-sm text-muted-foreground">Crie sua primeira meta.</p></div>}</div>
}

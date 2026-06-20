"use client"

import { useState, type FormEvent, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { CurrencyInput, formatCurrencyInput } from "@/components/ui/currency-input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FINANCIAL_OBJECTIVE_LABELS } from "@/lib/categories"
import { parseAmountInput } from "@/lib/finance"
import { useStore } from "@/lib/store"
import type { FinancialObjective, SalaryEffectiveScope } from "@/lib/types"

type EditIncomeDialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
}

const SCOPE_HINTS: Record<SalaryEffectiveScope, string> = {
  "current-month": "Meses anteriores mantêm o salário que estava vigente na época.",
  "next-month": "O mês atual não muda; a nova renda vale do próximo mês em diante.",
  "all-months": "Todo o histórico passa a usar a nova renda — use com cuidado em relatórios.",
}

export function EditIncomeDialog({ open, onOpenChange, trigger }: EditIncomeDialogProps) {
  const { financialProfile, updateIncome, notify } = useStore()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const dialogOpen = isControlled ? open : internalOpen
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen

  const [monthlySalary, setMonthlySalary] = useState(formatCurrencyInput(financialProfile.monthlySalary))
  const [salaryDay, setSalaryDay] = useState(String(financialProfile.salaryDay))
  const [expectedExtraIncome, setExpectedExtraIncome] = useState(
    formatCurrencyInput(financialProfile.expectedExtraIncome ?? 0),
  )
  const [monthlyReserve, setMonthlyReserve] = useState(
    formatCurrencyInput(financialProfile.monthlyReserve ?? 0),
  )
  const [objective, setObjective] = useState<FinancialObjective>(financialProfile.objective)
  const [scope, setScope] = useState<SalaryEffectiveScope>("current-month")

  function resetForm() {
    setMonthlySalary(formatCurrencyInput(financialProfile.monthlySalary))
    setSalaryDay(String(financialProfile.salaryDay))
    setExpectedExtraIncome(formatCurrencyInput(financialProfile.expectedExtraIncome ?? 0))
    setMonthlyReserve(formatCurrencyInput(financialProfile.monthlyReserve ?? 0))
    setObjective(financialProfile.objective)
    setScope("current-month")
  }

  function handleOpenChange(next: boolean) {
    if (next) resetForm()
    setDialogOpen(next)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const salary = parseAmountInput(monthlySalary)
    const day = Number.parseInt(salaryDay, 10)
    const extra = parseAmountInput(expectedExtraIncome)
    const reserve = parseAmountInput(monthlyReserve)

    if (salary <= 0) {
      notify({
        kind: "error",
        type: "error",
        title: "Salário inválido",
        message: "Informe um salário mensal maior que zero.",
      })
      return
    }
    if (!Number.isFinite(day) || day < 1 || day > 31) {
      notify({
        kind: "error",
        type: "error",
        title: "Dia inválido",
        message: "Informe um dia de recebimento entre 1 e 31.",
      })
      return
    }

    updateIncome(
      {
        monthlySalary: salary,
        salaryDay: day,
        expectedExtraIncome: extra,
        monthlyReserve: reserve,
        objective,
      },
      scope,
    )
    setDialogOpen(false)
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar renda</DialogTitle>
          <DialogDescription>
            Ajuste salário, rendas extras e reserva mensal. Escolha a partir de qual mês a alteração vale.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="edit-salary">Salário mensal líquido</Label>
              <CurrencyInput id="edit-salary" value={monthlySalary} onChange={setMonthlySalary} />
            </div>

            <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-payday">Dia de recebimento</Label>
                <Input
                  id="edit-payday"
                  type="number"
                  min={1}
                  max={31}
                  value={salaryDay}
                  onChange={(event) => setSalaryDay(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Objetivo financeiro principal</Label>
                <Select value={objective} onValueChange={(value) => setObjective(value as FinancialObjective)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FINANCIAL_OBJECTIVE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-extra">Rendas extras previstas no mês</Label>
                <CurrencyInput id="edit-extra" value={expectedExtraIncome} onChange={setExpectedExtraIncome} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-reserve">Reserva mensal para objetivos</Label>
                <CurrencyInput id="edit-reserve" value={monthlyReserve} onChange={setMonthlyReserve} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-scope">A partir de qual mês vale?</Label>
              <Select value={scope} onValueChange={(value) => setScope(value as SalaryEffectiveScope)}>
                <SelectTrigger id="edit-scope" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Somente a partir do mês atual</SelectItem>
                  <SelectItem value="next-month">A partir do próximo mês</SelectItem>
                  <SelectItem value="all-months">Recalcular também meses anteriores</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{SCOPE_HINTS[scope]}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="lg" className="flex-1">
              Salvar renda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
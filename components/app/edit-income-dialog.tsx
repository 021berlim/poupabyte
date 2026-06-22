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
import { isPredictableIncome } from "@/lib/income"
import {
  BUSINESS_SEPARATION_OPTIONS,
  INCOME_TYPE_OPTIONS,
  INCOME_VARIABILITY_OPTIONS,
  incomeTypeRequiresAmount,
} from "@/lib/onboarding-personalization"
import { useStore } from "@/lib/store"
import type {
  BusinessSeparation,
  FinancialObjective,
  IncomeType,
  IncomeVariability,
  SalaryEffectiveScope,
} from "@/lib/types"

type EditIncomeDialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
}

const SCOPE_HINTS: Record<SalaryEffectiveScope, string> = {
  "current-month": "Meses anteriores mantêm a renda que estava vigente na época.",
  "next-month": "O mês atual não muda; a nova renda vale do próximo mês em diante.",
  "all-months": "Todo o histórico passa a usar a nova renda — use com cuidado em relatórios.",
}

function incomeAmountLabel(incomeType: IncomeType): string {
  switch (incomeType) {
    case "salario-fixo":
      return "Renda mensal"
    case "autonomo":
      return "Média por mês"
    case "negocio-proprio":
      return "Retirada por mês"
    case "renda-variavel":
      return "Média do mês"
    case "ocasional":
      return "Quanto costuma receber"
    case "sem-renda":
      return "Entrada média"
    default:
      return "Renda mensal"
  }
}

export function EditIncomeDialog({ open, onOpenChange, trigger }: EditIncomeDialogProps) {
  const { financialProfile, updateIncome, notify } = useStore()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const dialogOpen = isControlled ? open : internalOpen
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen

  const [incomeType, setIncomeType] = useState<IncomeType>(financialProfile.incomeType ?? "salario-fixo")
  const [monthlySalary, setMonthlySalary] = useState(formatCurrencyInput(financialProfile.monthlySalary))
  const [salaryDay, setSalaryDay] = useState(String(financialProfile.salaryDay))
  const [incomeVariability, setIncomeVariability] = useState<IncomeVariability | "">(
    financialProfile.incomeVariability ?? "",
  )
  const [businessSeparation, setBusinessSeparation] = useState<BusinessSeparation | "">(
    financialProfile.businessSeparation ?? "",
  )
  const [monthlyReserve, setMonthlyReserve] = useState(
    formatCurrencyInput(financialProfile.monthlyReserve ?? 0),
  )
  const [objective, setObjective] = useState<FinancialObjective>(financialProfile.objective)
  const [scope, setScope] = useState<SalaryEffectiveScope>("current-month")

  const predictable = isPredictableIncome(incomeType)
  const requiresAmount = incomeTypeRequiresAmount(incomeType)

  function resetForm() {
    setIncomeType(financialProfile.incomeType ?? "salario-fixo")
    setMonthlySalary(formatCurrencyInput(financialProfile.monthlySalary))
    setSalaryDay(String(financialProfile.salaryDay))
    setIncomeVariability(financialProfile.incomeVariability ?? "")
    setBusinessSeparation(financialProfile.businessSeparation ?? "")
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
    const reserve = parseAmountInput(monthlyReserve)

    if (requiresAmount && salary <= 0) {
      notify({
        kind: "error",
        type: "error",
        title: "Renda inválida",
        message: "Informe um valor de renda maior que zero.",
      })
      return
    }
    if (predictable && (!Number.isFinite(day) || day < 1 || day > 31)) {
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
        monthlySalary: Math.max(0, salary),
        salaryDay: predictable && Number.isFinite(day) ? day : financialProfile.salaryDay,
        expectedExtraIncome: 0,
        monthlyReserve: reserve,
        objective,
        incomeType,
        incomeVariability: incomeVariability || undefined,
        businessSeparation: businessSeparation || undefined,
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
          <DialogDescription>Altere tipo e valores. Tudo recalcula sozinho.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-1.5">
              <Label>Tipo de renda</Label>
              <Select value={incomeType} onValueChange={(value) => setIncomeType(value as IncomeType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {INCOME_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {incomeType !== "sem-renda" ? (
              <div className="space-y-1.5">
                <Label htmlFor="edit-salary">{incomeAmountLabel(incomeType)}</Label>
                <CurrencyInput id="edit-salary" value={monthlySalary} onChange={setMonthlySalary} />
              </div>
            ) : null}

            {predictable ? (
              <div className="space-y-1.5">
                <Label htmlFor="edit-payday">Dia que recebe</Label>
                <Input
                  id="edit-payday"
                  type="number"
                  min={1}
                  max={31}
                  value={salaryDay}
                  onChange={(event) => setSalaryDay(event.target.value)}
                />
              </div>
            ) : null}

            {incomeType === "autonomo" ? (
              <div className="space-y-1.5">
                <Label>Varia muito?</Label>
                <Select
                  value={incomeVariability || undefined}
                  onValueChange={(value) => setIncomeVariability(value as IncomeVariability)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_VARIABILITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {incomeType === "negocio-proprio" ? (
              <div className="space-y-1.5">
                <Label>Separa pessoal e negócio?</Label>
                <Select
                  value={businessSeparation || undefined}
                  onValueChange={(value) => setBusinessSeparation(value as BusinessSeparation)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_SEPARATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Objetivo principal</Label>
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
              <div className="space-y-1.5">
                <Label htmlFor="edit-reserve">Reserva mensal</Label>
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
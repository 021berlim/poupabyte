"use client"

import { useMemo, useState, type FormEvent } from "react"
import { EditIncomeDialog } from "@/components/app/edit-income-dialog"
import { CreditCard, Repeat2, Split, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CurrencyInput, formatCurrencyInput } from "@/components/ui/currency-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { EXPENSE_CATEGORIES, FINANCIAL_OBJECTIVE_LABELS } from "@/lib/categories"
import { formatCurrency } from "@/lib/format"
import { parseAmountInput } from "@/lib/finance"
import { useStore } from "@/lib/store"
import type { CategoryId, FinancialObjective, Installment, Subscription } from "@/lib/types"
import { SectionLabel } from "./profile-settings"

export function FinancialPlanningSettings() {
  const {
    financialProfile,
    updateIncome,
    subscriptions,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    installments,
    addInstallment,
    deleteInstallment,
    creditCards,
    addCreditCard,
    deleteCreditCard,
  } = useStore()

  const [salary, setSalary] = useState(formatCurrencyInput(financialProfile.monthlySalary))
  const [salaryDay, setSalaryDay] = useState(String(financialProfile.salaryDay))
  const [objective, setObjective] = useState<FinancialObjective>(financialProfile.objective)
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false)

  const [subName, setSubName] = useState("")
  const [subAmount, setSubAmount] = useState("")
  const [subDay, setSubDay] = useState("1")
  const [subCategory, setSubCategory] = useState<CategoryId>("assinaturas")

  const [instName, setInstName] = useState("")
  const [instMonthly, setInstMonthly] = useState("")
  const [instCurrent, setInstCurrent] = useState("1")
  const [instTotal, setInstTotal] = useState("12")

  const [cardName, setCardName] = useState("")
  const [cardClosing, setCardClosing] = useState("1")
  const [cardDue, setCardDue] = useState("10")

  const subscriptionTotal = useMemo(
    () => subscriptions.filter((s) => s.active).reduce((acc, s) => acc + s.amount, 0),
    [subscriptions],
  )

  function saveProfile(event: FormEvent) {
    event.preventDefault()
    const monthlySalary = parseAmountInput(salary)
    const day = Number.parseInt(salaryDay, 10)
    if (monthlySalary <= 0 || !Number.isFinite(day) || day < 1 || day > 31) return
    updateIncome(
      {
        monthlySalary,
        salaryDay: day,
        expectedExtraIncome: financialProfile.expectedExtraIncome ?? 0,
        monthlyReserve: financialProfile.monthlyReserve ?? 0,
        objective,
      },
      "current-month",
    )
  }

  function addSub(event: FormEvent) {
    event.preventDefault()
    const amount = parseAmountInput(subAmount)
    const billingDay = Number.parseInt(subDay, 10)
    if (!subName.trim() || amount <= 0) return
    addSubscription({ name: subName.trim(), amount, category: subCategory, billingDay, frequency: "monthly", active: true })
    setSubName("")
    setSubAmount("")
  }

  function addInst(event: FormEvent) {
    event.preventDefault()
    const monthlyAmount = parseAmountInput(instMonthly)
    const installmentCount = Number.parseInt(instTotal, 10)
    const currentInstallment = Number.parseInt(instCurrent, 10)
    if (!instName.trim() || monthlyAmount <= 0 || installmentCount < 1) return
    const now = new Date()
    const end = new Date(now)
    end.setMonth(end.getMonth() + (installmentCount - currentInstallment))
    const payload: Omit<Installment, "id"> = {
      name: instName.trim(),
      totalAmount: monthlyAmount * installmentCount,
      installmentCount,
      currentInstallment,
      monthlyAmount,
      category: "parcelamentos",
      startDate: now.toISOString(),
      endDate: end.toISOString(),
      status: "active",
    }
    addInstallment(payload)
    setInstName("")
    setInstMonthly("")
  }

  function addCard(event: FormEvent) {
    event.preventDefault()
    if (!cardName.trim()) return
    addCreditCard({
      name: cardName.trim(),
      closingDay: Number.parseInt(cardClosing, 10),
      dueDay: Number.parseInt(cardDue, 10),
      active: true,
    })
    setCardName("")
  }

  return (
    <div className="space-y-8">
      <section>
        <SectionLabel id="salary-config" icon={Wallet}>Renda</SectionLabel>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="monthly-salary">Renda mensal</Label>
            <CurrencyInput id="monthly-salary" value={salary} onChange={setSalary} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="salary-day">Dia que recebe</Label>
              <Input id="salary-day" type="number" min={1} max={31} value={salaryDay} onChange={(e) => setSalaryDay(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Foco principal</Label>
              <Select value={objective} onValueChange={(value) => setObjective(value as FinancialObjective)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FINANCIAL_OBJECTIVE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" className="flex-1">Salvar renda</Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIncomeDialogOpen(true)}>
              Editar renda completa
            </Button>
          </div>
        </form>
        <EditIncomeDialog open={incomeDialogOpen} onOpenChange={setIncomeDialogOpen} />
      </section>

      <section>
        <SectionLabel id="subscriptions" icon={Repeat2}>Assinaturas ({formatCurrency(subscriptionTotal)}/mês)</SectionLabel>
        <form onSubmit={addSub} className="mb-4 grid gap-3 sm:grid-cols-2">
          <Input placeholder="Nome" value={subName} onChange={(e) => setSubName(e.target.value)} />
          <CurrencyInput placeholder="Valor" value={subAmount} onChange={setSubAmount} />
          <Input type="number" min={1} max={31} placeholder="Dia cobrança" value={subDay} onChange={(e) => setSubDay(e.target.value)} />
          <Select value={subCategory} onValueChange={(v) => setSubCategory(v as CategoryId)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="submit" className="sm:col-span-2">Adicionar assinatura</Button>
        </form>
        <ul className="divide-y">
          {subscriptions.map((sub: Subscription) => (
            <li key={sub.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-semibold">{sub.name}</p>
                <p className="text-xs text-muted-foreground">Dia {sub.billingDay} · {formatCurrency(sub.amount)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={sub.active} onCheckedChange={(checked) => updateSubscription({ ...sub, active: checked === true })} aria-label={`Ativa ${sub.name}`} />
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteSubscription(sub.id)}>Remover</Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionLabel id="installments" icon={Split}>Parcelamentos</SectionLabel>
        <form onSubmit={addInst} className="mb-4 grid gap-3 sm:grid-cols-2">
          <Input placeholder="Descrição" value={instName} onChange={(e) => setInstName(e.target.value)} />
          <CurrencyInput placeholder="Parcela mensal" value={instMonthly} onChange={setInstMonthly} />
          <Input type="number" min={1} placeholder="Parcela atual" value={instCurrent} onChange={(e) => setInstCurrent(e.target.value)} />
          <Input type="number" min={1} placeholder="Total parcelas" value={instTotal} onChange={(e) => setInstTotal(e.target.value)} />
          <Button type="submit" className="sm:col-span-2">Adicionar parcelamento</Button>
        </form>
        <ul className="divide-y">
          {installments.map((inst) => (
            <li key={inst.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-semibold">{inst.name}</p>
                <p className="text-xs text-muted-foreground">{inst.currentInstallment}/{inst.installmentCount} · {formatCurrency(inst.monthlyAmount)}/mês</p>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteInstallment(inst.id)}>Remover</Button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionLabel id="cards" icon={CreditCard}>Cartões (controle manual)</SectionLabel>
        <form onSubmit={addCard} className="mb-4 grid gap-3 sm:grid-cols-3">
          <Input placeholder="Nome do cartão" value={cardName} onChange={(e) => setCardName(e.target.value)} className="sm:col-span-3" />
          <Input type="number" min={1} max={31} placeholder="Fechamento" value={cardClosing} onChange={(e) => setCardClosing(e.target.value)} />
          <Input type="number" min={1} max={31} placeholder="Vencimento" value={cardDue} onChange={(e) => setCardDue(e.target.value)} />
          <Button type="submit">Adicionar cartão</Button>
        </form>
        <ul className="divide-y">
          {creditCards.map((card) => (
            <li key={card.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-semibold">{card.name}</p>
                <p className="text-xs text-muted-foreground">Fecha dia {card.closingDay} · Vence dia {card.dueDay}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteCreditCard(card.id)}>Remover</Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
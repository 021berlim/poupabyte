"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter,
 DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CurrencyInput, formatCurrencyInput } from "@/components/ui/currency-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select"
import { TransactionRecurrenceFields } from "@/components/app/transaction-recurrence-fields"
import { isManageCategoriesSelectValue, ManageCategoriesSelectOption } from "@/components/app/manage-categories-select-option"
import { FORM, TOAST, TRANSACTION_TYPES } from "@/lib/copy"
import { ROUTES } from "@/lib/routes"
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories"
import { getCategoryIcon } from "@/lib/category-icons"
import { parseAmountInput, validateTransaction } from "@/lib/finance"
import {
 applyRecurrenceFlags,
 buildRecurrenceFromForm,
 defaultRecurrenceFormState,
 recurrenceFormStateFromTransaction,
 validateRecurrenceForm,
} from "@/lib/transaction-recurrence"
import type { Transaction, TransactionType, CategoryId, CategoryRef } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Props {
 trigger?: React.ReactNode
 transaction?: Transaction
 open?: boolean
 onOpenChange?: (open: boolean) => void
 defaultType?: TransactionType
}

export function TransactionDialog({ trigger, transaction, open, onOpenChange, defaultType = "expense" }: Props) {
 const router = useRouter()
 const { addTransaction, updateTransaction, notify } = useStore()
 const isEdit = !!transaction
 const [internalOpen, setInternalOpen] = useState(false)
 const isControlled = open !== undefined
 const dialogOpen = isControlled ? open : internalOpen
 const setOpen = isControlled ? onOpenChange! : setInternalOpen

 const [type, setType] = useState<TransactionType>(transaction?.type ?? defaultType)
 const [description, setDescription] = useState(transaction?.description ?? "")
 const [amount, setAmount] = useState(transaction ? formatCurrencyInput(transaction.amount) : "")
 const [category, setCategory] = useState<CategoryRef>(transaction?.category ?? "alimentacao")
 const [date, setDate] = useState(
  transaction ? transaction.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
 )
 const [recurrenceForm, setRecurrenceForm] = useState(() => recurrenceFormStateFromTransaction(transaction))

 useEffect(() => {
  if (!dialogOpen) return
  setType(transaction?.type ?? defaultType)
  setDescription(transaction?.description ?? "")
  setAmount(transaction ? formatCurrencyInput(transaction.amount) : "")
  setCategory(transaction?.category ?? "alimentacao")
  setDate(transaction ? transaction.date.slice(0, 10) : new Date().toISOString().slice(0, 10))
  setRecurrenceForm(recurrenceFormStateFromTransaction(transaction))
 }, [dialogOpen, transaction, defaultType])

 const categories =
  type === "income" ? INCOME_CATEGORIES : type === "transfer" ? [] : EXPENSE_CATEGORIES

 function handleTypeChange(next: TransactionType) {
  setType(next)
  if (next === "transfer") {
   setCategory("transferencias")
   setRecurrenceForm(defaultRecurrenceFormState(date))
   return
  }
  const valid = (next === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).some((c) => c.id === category)
  if (!valid) setCategory(next === "income" ? "salario" : "alimentacao")
  if (next !== "expense") setRecurrenceForm(defaultRecurrenceFormState(date))
 }

 function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  const value = parseAmountInput(amount)
  const isoDate = date ? new Date(date + "T12:00:00").toISOString() : ""
  const recurrenceErrors = type === "expense" ? validateRecurrenceForm(recurrenceForm, isoDate) : []
  if (recurrenceErrors.length > 0) {
   notify({ kind: "error", type: "error", title: "Recorrência inválida", message: recurrenceErrors[0] })
   return
  }

  const recurrence = type === "expense" ? buildRecurrenceFromForm(recurrenceForm) : undefined
  const payload = applyRecurrenceFlags({
   type,
   description: description.trim(),
   amount: value,
   category,
   date: isoDate,
   recurrence,
   subscriptionId: recurrence?.kind === "subscription" ? transaction?.subscriptionId : undefined,
  })
  const errors = validateTransaction(payload)
  if (errors.length > 0) {
   notify({ kind: "error", type: "error", title: "Lançamento inválido", message: errors[0] ?? TOAST.error.invalidTransaction })
   return
  }

  if (isEdit) {
   updateTransaction({ ...payload, id: transaction!.id })
  } else {
   addTransaction(payload)
   setDescription("")
   setAmount("")
   setRecurrenceForm(defaultRecurrenceFormState())
  }
  setOpen(false)
 }

 return (
  <Dialog open={dialogOpen} onOpenChange={setOpen}>
   {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
   <DialogContent className="max-h-[min(92vh,48rem)] overflow-y-auto">
    <DialogHeader>
     <DialogTitle>
      {isEdit
       ? "Editar lançamento"
       : type === "income"
         ? FORM.newIncome
         : type === "expense"
           ? FORM.newExpense
           : FORM.newTransaction}
     </DialogTitle>
     <DialogDescription>
      {isEdit
       ? "Atualize valor, data e categoria."
       : type === "transfer"
         ? "Registre uma transferência entre suas contas."
         : type === "income"
           ? "Registre dinheiro que entrou no mês."
           : "Registre um gasto do dia a dia."}
     </DialogDescription>
    </DialogHeader>

    <form onSubmit={handleSubmit}>
     <div className="space-y-4 px-6 py-5">
      <div className="grid grid-cols-3 gap-2 rounded-2xl border bg-muted p-1">
      {([
       { value: "expense" as const, label: TRANSACTION_TYPES.expense },
       { value: "income" as const, label: TRANSACTION_TYPES.income },
       { value: "transfer" as const, label: TRANSACTION_TYPES.transfer },
      ]).map((option) => (
       <button
        key={option.value}
        type="button"
        onClick={() => handleTypeChange(option.value)}
        className={cn(
         "rounded-2xl border border-transparent px-1 py-2 text-xs font-semibold transition-colors sm:text-sm",
         type === option.value
          ? option.value === "income"
           ? "border-success/40 bg-success text-success-foreground "
           : option.value === "transfer"
             ? "border-border bg-background text-foreground"
             : "border-primary/40 bg-destructive text-destructive-foreground "
          : "text-muted-foreground hover:text-foreground",
        )}
       >
        {option.label}
       </button>
      ))}
     </div>
     {type === "transfer" ? (
      <p className="text-xs text-muted-foreground">
       Use quando o valor foi entre suas contas. Não entra como entrada nem gasto do mês.
      </p>
     ) : null}

     <div className="space-y-1.5">
      <Label htmlFor="tx-desc">Descrição</Label>
      <Input
       id="tx-desc"
       value={description}
       onChange={(e) => setDescription(e.target.value)}
       placeholder={type === "income" ? FORM.incomeSource : FORM.whereSpent}
      />
     </div>

     <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
      <div className="space-y-1.5">
       <Label htmlFor="tx-amount">
        {type === "income" ? FORM.incomeAmount : type === "expense" ? FORM.expenseAmount : "Valor"}
       </Label>
       <CurrencyInput
        id="tx-amount"
        value={amount}
        onChange={setAmount}
       />
      </div>
      <div className="space-y-1.5">
       <Label htmlFor="tx-date">Data</Label>
       <Input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
     </div>

     {type !== "transfer" ? (
     <div className="space-y-1.5">
      <Label>Categoria</Label>
      <Select
       value={category}
       onValueChange={(v) => {
        if (isManageCategoriesSelectValue(v)) {
         setOpen(false)
         router.push(ROUTES.categories)
         return
        }
        setCategory(v as CategoryId)
       }}
      >
       <SelectTrigger>
        <SelectValue placeholder="Selecione" />
       </SelectTrigger>
       <SelectContent>
        {categories.map((c) => {
         const Icon = getCategoryIcon(c.id)

         return (
          <SelectItem key={c.id} value={c.id}>
           <span className="flex items-center gap-2">
            <Icon className="h-4 w-4" style={{ color: c.color }} />
            {c.label}
           </span>
          </SelectItem>
         )
        })}
        <ManageCategoriesSelectOption />
       </SelectContent>
      </Select>
     </div>
     ) : null}

     {type === "expense" ? (
      <TransactionRecurrenceFields value={recurrenceForm} onChange={setRecurrenceForm} />
     ) : null}

     </div>

     <DialogFooter>
      <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setOpen(false)}>
       Cancelar
      </Button>
      <Button type="submit" size="lg" className="flex-1">
       {isEdit ? "Salvar alterações" : "Adicionar"}
      </Button>
     </DialogFooter>
    </form>
   </DialogContent>
  </Dialog>
 )
}
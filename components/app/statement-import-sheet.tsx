"use client"

import { useMemo, useRef, useState, type DragEvent } from "react"
import { AlertCircle, ChevronDown, FileText, RotateCcw, Upload, UploadCloud } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { suggestCategory } from "@/lib/auto-categorize"
import type { CategoryContext } from "@/lib/category-system"
import { CATEGORY_LIST, getCategory } from "@/lib/categories"
import { formatCurrency } from "@/lib/format"
import { apiUrl } from "@/lib/api-url"
import type { ParsedStatementTransaction, StatementBank } from "@/lib/statement-import"
import { useStore } from "@/lib/store"
import {
  applyRecurrenceFlags,
  buildRecurrenceFromForm,
  defaultRecurrenceFormState,
  type RecurrenceFormState,
} from "@/lib/transaction-recurrence"
import type { CategoryId, TransactionType } from "@/lib/types"
import { cn } from "@/lib/utils"

type Stage = "upload" | "processing" | "review"
type ReviewItem = ParsedStatementTransaction & {
  id: string
  selected: boolean
  duplicate: boolean
  recurrenceForm: RecurrenceFormState
  isInstallment?: boolean
}

const BANK_LABELS: Record<StatementBank, string> = {
  auto: "Detectar automaticamente",
  inter: "Banco Inter",
  bradesco: "Bradesco",
  itau: "Itaú",
  nubank: "Nubank",
  other: "Outro",
}

const TYPE_LABELS: Record<TransactionType, string> = {
  income: "Receita",
  expense: "Despesa",
  transfer: "Entre minhas contas",
}

function comparableDescription(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\b(pix|recebido|enviado|qr|code|dinamico|estatico|compra|debito)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function descriptionsAreSimilar(a: string, b: string) {
  const left = comparableDescription(a)
  const right = comparableDescription(b)
  if (!left || !right) return false
  if (left.includes(right) || right.includes(left)) return true
  const leftTokens = new Set(left.split(" ").filter((token) => token.length > 2))
  const rightTokens = new Set(right.split(" ").filter((token) => token.length > 2))
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length
  const union = new Set([...leftTokens, ...rightTokens]).size
  return union > 0 && intersection / union >= 0.6
}

function isExistingDuplicate(item: ParsedStatementTransaction, transactions: ReturnType<typeof useStore>["transactions"]) {
  return transactions.some(
    (transaction) =>
      transaction.date.slice(0, 10) === item.date &&
      Math.abs(transaction.amount - item.amount) < 0.005 &&
      descriptionsAreSimilar(transaction.description, item.description),
  )
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })
    .format(new Date(`${value}T12:00:00`))
    .replace(".", "")
}

function needsCategoryReview(item: ReviewItem) {
  return item.confidence < 0.85 || item.category === "nao-categorizado"
}

function ReviewImportItem({
  item,
  updateItem,
}: {
  item: ReviewItem
  updateItem: (id: string, patch: Partial<ReviewItem>) => void
}) {
  const flagged = needsCategoryReview(item)

  return (
    <Collapsible defaultOpen={flagged} className={cn("group px-6 py-4", !item.selected && "opacity-65")}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
        <Checkbox
          className="mt-1"
          checked={item.selected}
          onCheckedChange={(checked) => updateItem(item.id, { selected: checked === true })}
          aria-label={`Selecionar ${item.description}`}
        />
        <div className="min-w-0 space-y-2.5">
          <CollapsibleTrigger className="app-row-hover -mx-2 flex w-[calc(100%+1rem)] items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{item.description}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{getCategory(item.category).label}</p>
            </div>
            <p
              className={cn(
                "shrink-0 text-sm font-bold tabular-nums",
                item.type === "income"
                  ? "text-success"
                  : item.type === "transfer"
                    ? "text-muted-foreground"
                    : "text-destructive",
              )}
            >
              {item.type === "income" ? "+" : item.type === "transfer" ? "↔" : "-"}
              {formatCurrency(item.amount)}
            </p>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2.5">
            <Input
              value={item.description}
              onChange={(event) => updateItem(item.id, { description: event.target.value })}
              className="h-8 text-sm font-semibold"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Select value={item.type} onValueChange={(value) => updateItem(item.id, { type: value as TransactionType })}>
                <SelectTrigger size="sm" className="h-7 w-auto rounded-lg text-xs"><SelectValue>{TYPE_LABELS[item.type]}</SelectValue></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={item.category} onValueChange={(value) => updateItem(item.id, { category: value as CategoryId })}>
                <SelectTrigger size="sm" className="h-7 w-auto max-w-44 rounded-lg text-xs"><SelectValue>{getCategory(item.category).label}</SelectValue></SelectTrigger>
                <SelectContent>
                  {CATEGORY_LIST.map((category) => <SelectItem key={category.id} value={category.id}>{category.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {item.type === "expense" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Select
                  value={item.recurrenceForm.enabled ? item.recurrenceForm.kind : "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      updateItem(item.id, { recurrenceForm: defaultRecurrenceFormState(item.date) })
                      return
                    }
                    updateItem(item.id, {
                      recurrenceForm: {
                        ...item.recurrenceForm,
                        enabled: true,
                        kind: value as RecurrenceFormState["kind"],
                        frequency: value === "fixed" ? "monthly" : item.recurrenceForm.frequency,
                        durationKind: value === "fixed" ? "indefinite" : item.recurrenceForm.durationKind,
                      },
                    })
                  }}
                >
                  <SelectTrigger size="sm" className="h-8 w-full rounded-lg text-xs">
                    <SelectValue placeholder="Recorrência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem recorrência</SelectItem>
                    <SelectItem value="subscription">Assinatura</SelectItem>
                    <SelectItem value="fixed">Conta fixa</SelectItem>
                    <SelectItem value="custom">Outra recorrência</SelectItem>
                  </SelectContent>
                </Select>
                {item.recurrenceForm.enabled ? (
                  <Select
                    value={item.recurrenceForm.durationKind}
                    onValueChange={(value) =>
                      updateItem(item.id, {
                        recurrenceForm: {
                          ...item.recurrenceForm,
                          durationKind: value as RecurrenceFormState["durationKind"],
                        },
                      })
                    }
                  >
                    <SelectTrigger size="sm" className="h-8 w-full rounded-lg text-xs">
                      <SelectValue placeholder="Duração" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indefinite">Sem prazo</SelectItem>
                      <SelectItem value="until">Até uma data</SelectItem>
                      <SelectItem value="count">Número de cobranças</SelectItem>
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
            ) : null}
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={item.isInstallment ?? false} onCheckedChange={(checked) => updateItem(item.id, { isInstallment: checked === true })} />
              Parcelamento
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {item.duplicate ? <Badge variant="outline" className="border-amber-500/45 text-amber-700 dark:text-amber-300">Possível duplicata</Badge> : null}
              {flagged ? <Badge variant="outline" className="border-amber-500/45 text-amber-700 dark:text-amber-300">Verificar categoria</Badge> : null}
            </div>
          </CollapsibleContent>
        </div>
      </div>
    </Collapsible>
  )
}

export function StatementImportSheet() {
  const {
    transactions,
    addTransactions,
    setLastImport,
    notify,
    userCategories,
    hiddenSystemCategories,
    categoryRules,
  } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<Stage>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [bank, setBank] = useState<StatementBank>("auto")
  const [detectedBank, setDetectedBank] = useState<StatementBank>("auto")
  const [password, setPassword] = useState("")
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [error, setError] = useState("")
  const [items, setItems] = useState<ReviewItem[]>([])

  const selectedCount = items.filter((item) => item.selected).length
  const allSelected = items.length > 0 && selectedCount === items.length
  const reviewSummary = useMemo(() => {
    const selected = items.filter((item) => item.selected)
    const income = selected.filter((item) => item.type === "income").reduce((acc, item) => acc + item.amount, 0)
    const expense = selected.filter((item) => item.type === "expense").reduce((acc, item) => acc + item.amount, 0)
    return {
      total: items.length,
      autoCategorized: items.filter((item) => item.category !== "nao-categorizado" && item.confidence >= 0.85).length,
      pending: items.filter((item) => item.category === "nao-categorizado" || item.confidence < 0.85).length,
      duplicates: items.filter((item) => item.duplicate).length,
      ignored: items.filter((item) => !item.selected).length,
      income,
      expense,
    }
  }, [items])

  const grouped = useMemo(() => {
    const groups = new Map<string, ReviewItem[]>()
    for (const item of items) groups.set(item.date, [...(groups.get(item.date) ?? []), item])
    return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [items])

  function reset() {
    setStage("upload")
    setFile(null)
    setBank("auto")
    setDetectedBank("auto")
    setPassword("")
    setPasswordRequired(false)
    setError("")
    setItems([])
    if (inputRef.current) inputRef.current.value = ""
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && stage === "processing") return
    setOpen(nextOpen)
    if (!nextOpen) window.setTimeout(reset, 250)
  }

  function chooseFile(nextFile?: File) {
    if (!nextFile) return
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Envie um arquivo no formato PDF.")
      return
    }
    if (nextFile.size > 10 * 1024 * 1024) {
      setError("O PDF deve ter no máximo 10 MB.")
      return
    }
    setFile(nextFile)
    setError("")
    setPasswordRequired(false)
    setPassword("")
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    chooseFile(event.dataTransfer.files[0])
  }

  async function processFile() {
    if (!file) {
      setError("Selecione um arquivo PDF.")
      return
    }
    setStage("processing")
    setError("")
    const body = new FormData()
    body.append("file", file)
    body.append("bank", bank)
    if (password) body.append("password", password)

    try {
      const response = await fetch(apiUrl("/api/import-statement"), { method: "POST", body })
      const result = (await response.json()) as {
        code?: string
        message?: string
        bank?: StatementBank
        transactions?: ParsedStatementTransaction[]
      }
      if (!response.ok || !result.transactions) {
        setPasswordRequired(result.code === "PASSWORD_REQUIRED" || result.code === "INVALID_PASSWORD")
        setError(result.message ?? "Não foi possível processar este extrato.")
        setStage("upload")
        return
      }

      const categoryCtx: CategoryContext = { userCategories, hiddenSystemCategories }
      const reviewItems = result.transactions.map((transaction, index) => {
        const duplicate = isExistingDuplicate(transaction, transactions)
        const suggestion = suggestCategory(transaction.description, transaction.type, categoryCtx, categoryRules)
        return {
          ...transaction,
          category: suggestion.category,
          subcategoryId: suggestion.subcategoryId,
          confidence: suggestion.confidence,
          id: `${transaction.date}-${index}`,
          duplicate,
          selected: !duplicate,
          recurrenceForm: defaultRecurrenceFormState(`${transaction.date}T12:00:00.000Z`),
        }
      })
      setDetectedBank(result.bank ?? bank)
      setItems(reviewItems)
      setStage("review")
    } catch {
      setError("Não foi possível processar o extrato. Verifique sua conexão e tente novamente.")
      setStage("upload")
    }
  }

  function updateItem(id: string, update: Partial<ReviewItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...update } : item)))
  }

  function importSelected() {
    const selected = items.filter((item) => item.selected)
    const pendingReview = selected.filter(
      (item) => item.category === "nao-categorizado" || item.confidence < 0.85,
    ).length
    const autoCategorized = selected.filter(
      (item) => item.category !== "nao-categorizado" && item.confidence >= 0.85,
    ).length
    const incomeTotal = selected
      .filter((item) => item.type === "income")
      .reduce((acc, item) => acc + item.amount, 0)
    const expenseTotal = selected
      .filter((item) => item.type === "expense")
      .reduce((acc, item) => acc + item.amount, 0)
    const categoriesUpdated = new Set(selected.map((item) => item.category)).size
    const duplicates = selected.filter((item) => item.duplicate).length

    const imported = addTransactions(
      selected.map((item) =>
        applyRecurrenceFlags({
          type: item.type,
          description: item.description,
          amount: item.amount,
          category: item.category,
          subcategoryId: item.subcategoryId,
          date: new Date(`${item.date}T12:00:00`).toISOString(),
          source: "pdf-import" as const,
          needsReview: item.category === "nao-categorizado" || item.confidence < 0.85,
          recurrence: item.type === "expense" ? buildRecurrenceFromForm(item.recurrenceForm) : undefined,
          isInstallment: item.isInstallment,
        }),
      ),
    )
    if (imported > 0) {
      setLastImport({
        fileName: file?.name ?? "Extrato.pdf",
        importedAt: new Date().toISOString(),
        totalFound: items.length,
        importedCount: imported,
        incomeTotal,
        expenseTotal,
        autoCategorized,
        pendingReview,
        duplicates,
        categoriesUpdated,
      })
      notify({
        kind: "transaction",
        type: "success",
        title: "Importação concluída",
        message: `${imported} movimentações importadas · ${formatCurrency(incomeTotal)} em receitas · ${formatCurrency(expenseTotal)} em despesas${pendingReview > 0 ? ` · ${pendingReview} precisam de revisão` : ""}.`,
      })
      handleOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline"><Upload className="size-4" />Importar extrato</Button>
      </SheetTrigger>
      <SheetContent side="responsive" className="overflow-hidden">
        {stage === "upload" ? (
          <>
            <SheetHeader>
              <SheetTitle>Importar extrato</SheetTitle>
              <SheetDescription>Envie o PDF do extrato bancário. Você revisará tudo antes de salvar.</SheetDescription>
            </SheetHeader>
            <div className="app-responsive-modal-body space-y-5 px-6 py-5">
              <div
                className={cn(
                  "flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-5 py-8 text-center transition-colors hover:bg-muted/35",
                  file && "border-primary/50 bg-muted/25",
                )}
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click() }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
              >
                {file ? <FileText className="size-8 text-primary" /> : <UploadCloud className="size-8 text-muted-foreground" />}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{file ? file.name : "Selecione ou arraste o PDF"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{file ? `${(file.size / 1024).toFixed(0)} KB` : "Arquivo original, até 10 MB"}</p>
                </div>
                <Input ref={inputRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Banco</label>
                <Select value={bank} onValueChange={(value) => setBank(value as StatementBank)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BANK_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {passwordRequired ? (
                <div className="space-y-1.5">
                  <label htmlFor="statement-password" className="text-xs font-semibold text-muted-foreground">Senha do PDF</label>
                  <Input id="statement-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="off" />
                </div>
              ) : null}

              {error ? (
                <div className="flex gap-2 border-y py-3 text-sm text-destructive" role="alert">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" /><p>{error}</p>
                </div>
              ) : null}
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
              <Button disabled={!file || (passwordRequired && !password)} onClick={processFile}>Continuar</Button>
            </SheetFooter>
          </>
        ) : null}

        {stage === "processing" ? (
          <>
            <SheetHeader>
              <SheetTitle>Lendo o extrato...</SheetTitle>
              <SheetDescription>Estamos identificando datas, valores e descrições.</SheetDescription>
            </SheetHeader>
            <div className="app-responsive-modal-body space-y-5 px-6 py-6" aria-busy="true">
              <Skeleton className="h-5 w-32" />
              {[0, 1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-center gap-3 border-b pb-4">
                  <Skeleton className="size-4" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div><Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </>
        ) : null}

        {stage === "review" ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2"><SheetTitle>Revisar importação</SheetTitle><Badge variant="outline">{BANK_LABELS[detectedBank]}</Badge></div>
              <SheetDescription>
                Encontramos {reviewSummary.total} movimentações no seu PDF. Revise antes de importar.
              </SheetDescription>
            </SheetHeader>
            <div className="shrink-0 space-y-2 border-b px-6 py-3 text-xs text-muted-foreground">
              <p>{reviewSummary.autoCategorized} categorizadas automaticamente · {reviewSummary.pending} pendentes · {reviewSummary.duplicates} possíveis duplicatas</p>
              <p>Receitas: {formatCurrency(reviewSummary.income)} · Despesas: {formatCurrency(reviewSummary.expense)}</p>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b px-6 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Checkbox checked={allSelected ? true : selectedCount > 0 ? "indeterminate" : false} onCheckedChange={(checked) => setItems((current) => current.map((item) => ({ ...item, selected: checked === true })))} />
                Selecionar todas
              </label>
              <span className="text-xs text-muted-foreground">{selectedCount} de {items.length} selecionadas</span>
            </div>
            <div className="app-responsive-modal-body">
              {grouped.map(([date, dateItems]) => (
                <section key={date}>
                  <div className="border-b bg-muted/25 px-6 py-2.5 text-xs font-semibold text-muted-foreground">{formatReviewDate(date)}</div>
                  <ul className="divide-y">
                    {dateItems.map((item) => (
                      <li key={item.id}>
                        <ReviewImportItem item={item} updateItem={updateItem} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <SheetFooter className="flex-col [&>[data-slot=button]]:w-full">
              <Button disabled={selectedCount === 0} onClick={importSelected}>Importar {selectedCount} {selectedCount === 1 ? "transação" : "transações"}</Button>
              <Button variant="ghost" size="sm" onClick={() => { setStage("upload"); setError("") }}><RotateCcw className="size-4" />Escolher outro arquivo</Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
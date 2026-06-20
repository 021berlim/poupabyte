"use client"

import { useRef, useState, type DragEvent } from "react"
import { AlertCircle, CheckCircle2, FileText, UploadCloud } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { suggestCategory } from "@/lib/auto-categorize"
import type { CategoryContext } from "@/lib/category-system"
import { apiUrl } from "@/lib/api-url"
import { parseCsvStatement, parseOfxStatement } from "@/lib/parse-tabular-statement"
import type { ParsedStatementTransaction, StatementBank } from "@/lib/statement-import"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { OnboardingActions } from "../onboarding-actions"
import { OnboardingStepHeader } from "../onboarding-shell"

const BANK_LABELS: Record<StatementBank, string> = {
  auto: "Detectar automaticamente",
  inter: "Banco Inter",
  bradesco: "Bradesco",
  itau: "Itaú",
  nubank: "Nubank",
  other: "Outro",
}

type ImportResult = {
  importedCount: number
  fileName: string
}

export function ImportStep({
  onContinue,
  onSkip,
}: {
  onContinue: (result: ImportResult | null) => void
  onSkip: () => void
}) {
  const { userCategories, hiddenSystemCategories, categoryRules, transactions, addTransactions, setLastImport } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [bank, setBank] = useState<StatementBank>("auto")
  const [password, setPassword] = useState("")
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [imported, setImported] = useState<ImportResult | null>(null)

  function chooseFile(nextFile?: File) {
    if (!nextFile) return
    const lower = nextFile.name.toLowerCase()
    const valid =
      nextFile.type === "application/pdf" ||
      lower.endsWith(".pdf") ||
      lower.endsWith(".csv") ||
      lower.endsWith(".ofx")
    if (!valid) {
      setError("Envie um arquivo PDF, CSV ou OFX.")
      return
    }
    if (nextFile.size > 10 * 1024 * 1024) {
      setError("O arquivo deve ter no máximo 10 MB.")
      return
    }
    setFile(nextFile)
    setError("")
    setImported(null)
    setPasswordRequired(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    chooseFile(event.dataTransfer.files[0])
  }

  async function parseFile(): Promise<ParsedStatementTransaction[]> {
    if (!file) return []
    const lower = file.name.toLowerCase()
    const categoryCtx: CategoryContext = { userCategories, hiddenSystemCategories }

    if (lower.endsWith(".csv")) {
      const text = await file.text()
      return parseCsvStatement(text, userCategories, categoryRules)
    }

    if (lower.endsWith(".ofx")) {
      const text = await file.text()
      return parseOfxStatement(text, userCategories, categoryRules)
    }

    const body = new FormData()
    body.append("file", file)
    body.append("bank", bank)
    if (password) body.append("password", password)

    const response = await fetch(apiUrl("/api/import-statement"), { method: "POST", body })
    const result = (await response.json()) as {
      code?: string
      message?: string
      transactions?: ParsedStatementTransaction[]
    }
    if (!response.ok || !result.transactions) {
      setPasswordRequired(result.code === "PASSWORD_REQUIRED" || result.code === "INVALID_PASSWORD")
      throw new Error(result.message ?? "Não foi possível processar este extrato.")
    }
    return result.transactions.map((transaction) => {
      const suggestion = suggestCategory(transaction.description, transaction.type, categoryCtx, categoryRules)
      return {
        ...transaction,
        category: suggestion.category,
        subcategoryId: suggestion.subcategoryId,
        confidence: suggestion.confidence,
      }
    })
  }

  async function handleContinue() {
    if (!file) {
      onContinue(null)
      return
    }
    if (imported) {
      onContinue(imported)
      return
    }

    setLoading(true)
    setError("")
    try {
      const parsed = await parseFile()
      if (parsed.length === 0) {
        setError("Nenhuma movimentação encontrada neste arquivo.")
        setLoading(false)
        return
      }

      const toImport = parsed.filter((item) => {
        return !transactions.some(
          (tx) =>
            tx.date.slice(0, 10) === item.date &&
            Math.abs(tx.amount - item.amount) < 0.005 &&
            tx.description.toLowerCase() === item.description.toLowerCase(),
        )
      })

      const incomeTotal = toImport.filter((i) => i.type === "income").reduce((a, i) => a + i.amount, 0)
      const expenseTotal = toImport.filter((i) => i.type === "expense").reduce((a, i) => a + i.amount, 0)
      const pendingReview = toImport.filter((i) => i.category === "nao-categorizado" || i.confidence < 0.85).length
      const autoCategorized = toImport.length - pendingReview

      const count = addTransactions(
        toImport.map((item) => ({
          type: item.type,
          description: item.description,
          amount: item.amount,
          category: item.category,
          subcategoryId: item.subcategoryId,
          date: new Date(`${item.date}T12:00:00`).toISOString(),
          source: "pdf-import" as const,
          needsReview: item.category === "nao-categorizado" || item.confidence < 0.85,
        })),
      )

      if (count > 0) {
        setLastImport({
          fileName: file.name,
          importedAt: new Date().toISOString(),
          totalFound: parsed.length,
          importedCount: count,
          incomeTotal,
          expenseTotal,
          autoCategorized,
          pendingReview,
          duplicates: parsed.length - toImport.length,
          categoriesUpdated: new Set(toImport.map((i) => i.category)).size,
        })
      }

      const result = { importedCount: count, fileName: file.name }
      setImported(result)
      onContinue(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível importar o extrato.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <OnboardingStepHeader
        title="Importe seu extrato"
        description="Envie PDF, CSV ou OFX do seu banco. As movimentações serão categorizadas automaticamente."
      />

      <div className="mt-6 space-y-4">
        <div
          className={cn(
            "flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-5 py-8 text-center transition-colors hover:bg-muted/35",
            file && "border-primary/50 bg-muted/25",
            imported && "border-success/50 bg-success/5",
          )}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") inputRef.current?.click()
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          {imported ? (
            <CheckCircle2 className="h-9 w-9 text-success" />
          ) : file ? (
            <FileText className="h-9 w-9 text-primary" />
          ) : (
            <UploadCloud className="h-9 w-9 text-muted-foreground" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {imported
                ? `${imported.importedCount} movimentações importadas`
                : file
                  ? file.name
                  : "Selecione ou arraste o arquivo"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {imported ? imported.fileName : "PDF, CSV ou OFX · até 10 MB"}
            </p>
          </div>
          <Input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf,.csv,.ofx,text/csv,application/x-ofx"
            className="sr-only"
            onChange={(event) => chooseFile(event.target.files?.[0])}
          />
        </div>

        {file?.name.toLowerCase().endsWith(".pdf") ? (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Banco</label>
            <Select value={bank} onValueChange={(value) => setBank(value as StatementBank)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BANK_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {passwordRequired ? (
          <div className="space-y-1.5">
            <label htmlFor="onboarding-pdf-password" className="text-xs font-semibold text-muted-foreground">
              Senha do PDF
            </label>
            <Input
              id="onboarding-pdf-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="off"
            />
          </div>
        ) : null}

        {error ? (
          <p className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>

      <OnboardingActions
        onContinue={handleContinue}
        onSkip={onSkip}
        loading={loading}
        continueLabel={file && !imported ? "Importar e continuar" : "Concluir"}
      />
    </div>
  )
}
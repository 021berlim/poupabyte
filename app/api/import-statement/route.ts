import { NextResponse } from "next/server"
import type { TextItem } from "pdfjs-dist/types/src/display/api"
import {
  parseStatement,
  suggestStatementCategory,
  type ParsedStatementTransaction,
  type StatementBank,
} from "@/lib/statement-import"
import type { TransactionType } from "@/lib/types"

export const runtime = "nodejs"
export const maxDuration = 30

const MAX_FILE_SIZE = 10 * 1024 * 1024
const VALID_BANKS = new Set<StatementBank>(["auto", "inter", "bradesco", "itau", "nubank", "other"])

class ImportError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 422,
  ) {
    super(message)
  }
}

async function extractPdfText(data: Uint8Array, password?: string) {
  const [pdfjs, pdfWorker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ])
  ;(globalThis as typeof globalThis & { pdfjsWorker?: typeof pdfWorker }).pdfjsWorker = pdfWorker
  let document
  try {
    document = await pdfjs.getDocument({ data, password, useSystemFonts: true }).promise
  } catch (error) {
    const pdfError = error as { code?: number; name?: string }
    if (pdfError.name === "PasswordException" || pdfError.code === 1 || pdfError.code === 2) {
      throw new ImportError(
        password ? "INVALID_PASSWORD" : "PASSWORD_REQUIRED",
        password ? "A senha informada não abriu este PDF." : "Este PDF é protegido. Informe a senha para continuar.",
      )
    }
    console.error("PDF extraction failed", error)
    throw new ImportError("INVALID_PDF", "Não foi possível abrir este PDF.")
  }

  const pages: string[] = []
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    const lines = new Map<number, Array<{ x: number; text: string }>>()
    for (const item of content.items) {
      if (!("str" in item)) continue
      const textItem = item as TextItem
      const y = Math.round(textItem.transform[5] * 2) / 2
      const line = lines.get(y) ?? []
      line.push({ x: textItem.transform[4], text: textItem.str })
      lines.set(y, line)
    }
    pages.push(
      [...lines.entries()]
        .sort(([a], [b]) => b - a)
        .map(([, items]) =>
          items
            .sort((a, b) => a.x - b.x)
            .map((item) => item.text)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim(),
        )
        .filter(Boolean)
        .join("\n"),
    )
  }
  await document.destroy()
  return pages.join("\n")
}

function cleanAiTransactions(value: unknown): ParsedStatementTransaction[] {
  const rows = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { transactions?: unknown }).transactions)
      ? (value as { transactions: unknown[] }).transactions
      : []

  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return []
    const item = row as Record<string, unknown>
    const type: TransactionType | null =
      item.tipo === "credito" || item.type === "income"
        ? "income"
        : item.tipo === "debito" || item.type === "expense"
          ? "expense"
          : null
    const date = String(item.data ?? item.date ?? "")
    const description = String(item.descricao ?? item.description ?? "").trim()
    const amount = Number(item.valor ?? item.amount)
    if (!type || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !description || !Number.isFinite(amount) || amount === 0) return []
    const suggestion = suggestStatementCategory(description, type)
    return [{
      date,
      description,
      amount: Math.abs(amount),
      type,
      category: suggestion.category,
      confidence: suggestion.confidence,
    }]
  })
}

async function parseWithAi(text: string) {
  const endpoint = process.env.STATEMENT_AI_ENDPOINT
  if (!endpoint) return []
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.STATEMENT_AI_TOKEN ? { Authorization: `Bearer ${process.env.STATEMENT_AI_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      textoExtraido: text,
      formato: [{ data: "YYYY-MM-DD", descricao: "string", valor: 0, tipo: "credito | debito" }],
    }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) return []
  return cleanAiTransactions(await response.json())
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    const requestedBank = String(formData.get("bank") ?? "auto") as StatementBank
    const password = String(formData.get("password") ?? "") || undefined

    if (!(file instanceof File)) throw new ImportError("FILE_REQUIRED", "Selecione um arquivo PDF.", 400)
    if (!VALID_BANKS.has(requestedBank)) throw new ImportError("INVALID_BANK", "Selecione um banco válido.", 400)
    if (file.size > MAX_FILE_SIZE) throw new ImportError("FILE_TOO_LARGE", "O PDF deve ter no máximo 10 MB.", 413)
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      throw new ImportError("INVALID_FILE_TYPE", "Envie um arquivo no formato PDF.", 415)
    }

    const text = await extractPdfText(new Uint8Array(await file.arrayBuffer()), password)
    if (text.replace(/\s/g, "").length < 40) {
      throw new ImportError(
        "SCANNED_PDF",
        "Não consegui ler esse PDF porque ele parece ser uma imagem. Tente exportar o extrato em PDF com texto pelo aplicativo do banco.",
      )
    }

    const parsed = parseStatement(text, requestedBank)
    if (parsed.transactions.length > 0) return NextResponse.json(parsed)

    const aiTransactions = await parseWithAi(text)
    if (aiTransactions.length > 0) {
      return NextResponse.json({ bank: parsed.bank, transactions: aiTransactions, usedAi: true })
    }
    throw new ImportError("NO_TRANSACTIONS", "Não conseguimos identificar movimentações neste extrato.")
  } catch (error) {
    if (error instanceof ImportError) {
      return NextResponse.json({ code: error.code, message: error.message }, { status: error.status })
    }
    console.error("Statement import failed", error)
    return NextResponse.json(
      { code: "PROCESSING_ERROR", message: "Ocorreu um erro ao processar o extrato. Tente novamente." },
      { status: 500 },
    )
  }
}

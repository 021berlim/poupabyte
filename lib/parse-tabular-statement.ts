import { suggestStatementCategory } from "./statement-import"
import type { ParsedStatementTransaction } from "./statement-import"
import type { CategoryRule, UserCategory } from "./types"
import type { CategoryId } from "./types"

function parseMoney(value: string) {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")
  const amount = Number.parseFloat(cleaned)
  return Math.abs(Number.isFinite(amount) ? amount : 0)
}

function brDateToIso(value: string) {
  const parts = value.trim().split(/[/-]/)
  if (parts.length === 3) {
    const [day, month, year] = parts
    const y = year.length === 2 ? `20${year}` : year
    return `${y}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }
  if (parts.length === 2) {
    const year = new Date().getFullYear()
    const [day, month] = parts
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }
  return ""
}

function inferType(amountRaw: string, description: string): "income" | "expense" {
  const normalized = description.toUpperCase()
  if (normalized.includes("PIX RECEBIDO") || normalized.includes("SALARIO") || normalized.includes("SALÁRIO")) {
    return "income"
  }
  if (amountRaw.includes("-") || amountRaw.trim().startsWith("(")) return "expense"
  const amount = parseMoney(amountRaw)
  if (amountRaw.includes("+")) return "income"
  return amount > 0 && !amountRaw.includes("-") ? "expense" : "expense"
}

function categorize(
  description: string,
  type: "income" | "expense",
  userCategories: UserCategory[],
  categoryRules: CategoryRule[],
): { category: ParsedStatementTransaction["category"]; confidence: number } {
  const suggestion = suggestStatementCategory(description, type, { userCategories, categoryRules })
  return { category: suggestion.category, confidence: suggestion.confidence }
}

export function parseCsvStatement(
  text: string,
  userCategories: UserCategory[] = [],
  categoryRules: CategoryRule[] = [],
): ParsedStatementTransaction[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const delimiter = lines[0].includes(";") ? ";" : ","
  const header = lines[0].toLowerCase()
  const dateIdx = header.split(delimiter).findIndex((c) => /data|date/.test(c))
  const descIdx = header.split(delimiter).findIndex((c) => /descr|hist|lan[cç]amento|memo|title/.test(c))
  const amountIdx = header.split(delimiter).findIndex((c) => /valor|amount|quantia|value/.test(c))

  const transactions: ParsedStatementTransaction[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""))
    const dateRaw = dateIdx >= 0 ? cols[dateIdx] : cols[0]
    const description = descIdx >= 0 ? cols[descIdx] : cols[1] ?? cols[0]
    const amountRaw = amountIdx >= 0 ? cols[amountIdx] : cols[cols.length - 1]
    const date = brDateToIso(dateRaw)
    const amount = parseMoney(amountRaw)
    if (!date || !description || amount <= 0) continue

    const type = inferType(amountRaw, description)
    const { category, confidence } = categorize(description, type, userCategories, categoryRules)
    transactions.push({ date, description, amount, type, category, confidence })
  }

  return transactions
}

export function parseOfxStatement(
  text: string,
  userCategories: UserCategory[] = [],
  categoryRules: CategoryRule[] = [],
): ParsedStatementTransaction[] {
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? []
  const transactions: ParsedStatementTransaction[] = []

  for (const block of blocks) {
    const dateRaw = block.match(/<DTPOSTED>(\d{8})/i)?.[1] ?? ""
    const amountRaw = block.match(/<TRNAMT>([^<]+)/i)?.[1] ?? "0"
    const description =
      block.match(/<MEMO>([^<]+)/i)?.[1]?.trim() ||
      block.match(/<NAME>([^<]+)/i)?.[1]?.trim() ||
      "Movimentação"
    if (!dateRaw) continue

    const date = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`
    const signed = Number.parseFloat(amountRaw.replace(",", "."))
    if (!Number.isFinite(signed) || signed === 0) continue

    const type = signed > 0 ? "income" : "expense"
    const amount = Math.abs(signed)
    const { category, confidence } = categorize(description, type, userCategories, categoryRules)
    transactions.push({ date, description, amount, type, category, confidence })
  }

  return transactions
}

export const SUGGESTED_ONBOARDING_CATEGORIES: CategoryId[] = ["alimentacao", "transporte", "moradia", "lazer"]
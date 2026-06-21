import type { Transaction } from "./types"

const OUTFLOW_TRANSFER_MARKERS = [
  "PIX ENVIADO",
  "TRANSFERENCIA ENVIADA",
  "TRANSFERÊNCIA ENVIADA",
  "TED ENVIADA",
  "DOC ENVIADO",
]

function normalizedDescription(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
}

/** Impacto líquido no caixa: receita soma, despesa subtrai, transferência entre contas próprias é neutra. */
export function transactionCashDelta(tx: Transaction): number {
  if (tx.type === "transfer") return 0
  return tx.type === "income" ? tx.amount : -tx.amount
}

export function isCashRelevant(tx: Transaction): boolean {
  return tx.type !== "transfer"
}

export function isLegacyOutflowTransfer(tx: Transaction): boolean {
  if (tx.type !== "transfer") return false
  const text = normalizedDescription(tx.description)
  return OUTFLOW_TRANSFER_MARKERS.some((marker) => text.includes(marker))
}

/** Converte PIX enviados antigos (tipo transfer) em despesa para alinhar com a regra de caixa. */
export function migrateLegacyTransactions(transactions: Transaction[]): Transaction[] {
  let changed = false
  const next = transactions.map((tx) => {
    if (!isLegacyOutflowTransfer(tx)) return tx
    changed = true
    return {
      ...tx,
      type: "expense" as const,
      category: tx.category === "transferencias" ? ("outros-gastos" as const) : tx.category,
    }
  })
  return changed ? next : transactions
}
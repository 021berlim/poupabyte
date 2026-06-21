import type { Transaction } from "@/lib/types"

export function establishmentKey(description: string): string {
  return description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, 40)
}

export function isPendingReview(tx: Transaction): boolean {
  return Boolean(tx.needsReview || tx.category === "nao-categorizado")
}

/** Tolerância de R$ 0,01 — mesmo valor ou diferença de até um centavo. */
export const AMOUNT_SIMILARITY_TOLERANCE = 0.01

export function amountsAreSimilar(
  a: number,
  b: number,
  tolerance = AMOUNT_SIMILARITY_TOLERANCE,
): boolean {
  return Math.abs(a - b) <= tolerance
}

export function findSimilarPending(transactions: Transaction[], source: Transaction): Transaction[] {
  const key = establishmentKey(source.description)
  if (key.length < 4) {
    return transactions.filter(
      (tx) =>
        tx.id === source.id &&
        isPendingReview(tx) &&
        amountsAreSimilar(tx.amount, source.amount),
    )
  }

  return transactions.filter(
    (tx) =>
      isPendingReview(tx) &&
      establishmentKey(tx.description) === key &&
      amountsAreSimilar(tx.amount, source.amount),
  )
}

export function formatImportDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .replace(".", "")
}
export const PENNY_CREATE_TRANSACTIONS_KEY = "poupabyte:penny:create-transactions-enabled"

export function readPennyCreateTransactionsEnabled(): boolean {
  if (typeof window === "undefined") return false
  try {
    const stored = window.localStorage.getItem(PENNY_CREATE_TRANSACTIONS_KEY)
    return stored === "true"
  } catch {
    return false
  }
}

export function writePennyCreateTransactionsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(PENNY_CREATE_TRANSACTIONS_KEY, String(enabled))
  } catch {}
}
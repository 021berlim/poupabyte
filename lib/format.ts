export function formatCurrency(value: number, opts?: { hideSymbol?: boolean }): string {
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value)
  return opts?.hideSymbol ? formatted.replace("R$", "").trim() : formatted
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso))
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso))
}

export function monthLabel(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(iso))
}

export function daysUntil(iso: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function relativeDeadline(iso: string): string {
  const d = daysUntil(iso)
  if (d < 0) return "Vencida"
  if (d === 0) return "Vence hoje"
  if (d === 1) return "1 dia restante"
  if (d < 30) return `${d} dias restantes`
  const months = Math.round(d / 30)
  return months === 1 ? "1 mês restante" : `${months} meses restantes`
}

export function isSameMonth(iso: string, ref: Date = new Date()): boolean {
  const d = new Date(iso)
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear()
}

import { NAV_ITEMS, type NavItem } from "@/lib/nav"
import { ROUTES, type Screen } from "@/lib/routes"
import type { Goal, Installment, Investment, Subscription, Transaction } from "@/lib/types"

export const ALWAYS_PRIMARY_ROUTES: Screen[] = [
  ROUTES.dashboard,
  ROUTES.transactions,
  ROUTES.limits,
  ROUTES.assistant,
]

export const OPTIONAL_ROUTES: Screen[] = [
  ROUTES.cashflow,
  ROUTES.goals,
  ROUTES.investments,
  ROUTES.reports,
]

export interface NavVisibilityData {
  transactions: Transaction[]
  goals: Goal[]
  investments: Investment[]
  subscriptions: Subscription[]
  installments: Installment[]
}

export function hasModuleData(href: Screen, data: NavVisibilityData): boolean {
  switch (href) {
    case ROUTES.cashflow:
      return data.subscriptions.length > 0 || data.installments.length > 0
    case ROUTES.goals:
      return data.goals.length > 0
    case ROUTES.investments:
      return data.investments.length > 0
    case ROUTES.reports:
      return data.transactions.length > 0
    default:
      return false
  }
}

export function resolveVisibleNav(data: NavVisibilityData) {
  const byHref = new Map(NAV_ITEMS.map((item) => [item.href, item]))

  const primary = ALWAYS_PRIMARY_ROUTES.map((href) => byHref.get(href)).filter(
    (item): item is NavItem => Boolean(item),
  )

  const promoted = OPTIONAL_ROUTES.filter((href) => hasModuleData(href, data))
    .map((href) => byHref.get(href))
    .filter((item): item is NavItem => Boolean(item))

  const more = OPTIONAL_ROUTES.filter((href) => !hasModuleData(href, data))
    .map((href) => byHref.get(href))
    .filter((item): item is NavItem => Boolean(item))

  return { primary, promoted, more, allVisible: [...primary, ...promoted] }
}
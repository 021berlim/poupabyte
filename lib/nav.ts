import {
  ArrowLeftRight,
  Landmark,
  LayoutGrid,
  PieChart,
  ShieldAlert,
  Sparkles,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { ROUTES, type Screen } from "@/lib/routes"

export type { Screen }

export interface NavItem {
  href: Screen
  label: string
  icon: LucideIcon
  group: NavGroup
  mobile?: "primary" | "more"
  mobileOrder?: number
}

export type NavGroup = "Hoje" | "Planejar" | "Crescer" | "Entender"

export const NAV_GROUP_ORDER: NavGroup[] = ["Hoje", "Planejar", "Crescer", "Entender"]

export const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.dashboard, label: "Visão geral", icon: LayoutGrid, group: "Hoje", mobile: "primary", mobileOrder: 1 },
  { href: ROUTES.transactions, label: "Movimentações", icon: ArrowLeftRight, group: "Hoje", mobile: "primary", mobileOrder: 2 },
  { href: ROUTES.cashflow, label: "Planejamento", icon: Wallet, group: "Planejar", mobile: "primary", mobileOrder: 3 },
  { href: ROUTES.goals, label: "Objetivos", icon: Target, group: "Planejar", mobile: "more" },
  { href: ROUTES.limits, label: "Orçamentos", icon: ShieldAlert, group: "Planejar", mobile: "more" },
  { href: ROUTES.investments, label: "Patrimônio", icon: Landmark, group: "Crescer", mobile: "more" },
  { href: ROUTES.reports, label: "Análises", icon: PieChart, group: "Entender", mobile: "more" },
  { href: ROUTES.assistant, label: "P.E.N.N.Y.", icon: Sparkles, group: "Entender", mobile: "more" },
]

export const MOBILE_PRIMARY_ITEMS = NAV_ITEMS
  .filter((item) => item.mobile === "primary")
  .sort((a, b) => (a.mobileOrder ?? 0) - (b.mobileOrder ?? 0))
export const MOBILE_MORE_ITEMS = NAV_ITEMS.filter((item) => item.mobile === "more")
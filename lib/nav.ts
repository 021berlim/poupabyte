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
  /** @deprecated Use resolveVisibleNav() for mobile layout */
  mobile?: "primary" | "more"
  mobileOrder?: number
}

export type NavGroup = "Hoje" | "Planejar" | "Crescer" | "Entender"

export const NAV_GROUP_ORDER: NavGroup[] = ["Hoje", "Planejar", "Crescer", "Entender"]

export const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.dashboard, label: "Visão geral", icon: LayoutGrid, group: "Hoje" },
  { href: ROUTES.transactions, label: "Movimentações", icon: ArrowLeftRight, group: "Hoje" },
  { href: ROUTES.limits, label: "Orçamentos", icon: ShieldAlert, group: "Planejar" },
  { href: ROUTES.assistant, label: "P.E.N.N.Y.", icon: Sparkles, group: "Entender" },
  { href: ROUTES.cashflow, label: "Planejamento", icon: Wallet, group: "Planejar" },
  { href: ROUTES.goals, label: "Objetivos", icon: Target, group: "Planejar" },
  { href: ROUTES.investments, label: "Patrimônio", icon: Landmark, group: "Crescer" },
  { href: ROUTES.reports, label: "Análises", icon: PieChart, group: "Entender" },
]
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

export type NavGroup = "Hoje" | "Planejar" | "Investir" | "Entender"

export const NAV_GROUP_ORDER: NavGroup[] = ["Hoje", "Planejar", "Investir", "Entender"]

export const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.dashboard, label: "Início", icon: LayoutGrid, group: "Hoje" },
  { href: ROUTES.transactions, label: "Lançamentos", icon: ArrowLeftRight, group: "Hoje" },
  { href: ROUTES.limits, label: "Limites", icon: ShieldAlert, group: "Planejar" },
  { href: ROUTES.assistant, label: "Penny", icon: Sparkles, group: "Entender" },
  { href: ROUTES.cashflow, label: "Fluxo", icon: Wallet, group: "Planejar" },
  { href: ROUTES.goals, label: "Metas", icon: Target, group: "Planejar" },
  { href: ROUTES.investments, label: "Investimentos", icon: Landmark, group: "Investir" },
  { href: ROUTES.reports, label: "Relatórios", icon: PieChart, group: "Entender" },
]
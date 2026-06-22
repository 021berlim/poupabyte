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
import { NAV_GROUPS, NAV_LABELS } from "@/lib/copy"
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

export const NAV_GROUP_ORDER: NavGroup[] = [
  NAV_GROUPS.hoje,
  NAV_GROUPS.planejar,
  NAV_GROUPS.investir,
  NAV_GROUPS.entender,
]

export const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.dashboard, label: NAV_LABELS.dashboard, icon: LayoutGrid, group: NAV_GROUPS.hoje },
  { href: ROUTES.transactions, label: NAV_LABELS.transactions, icon: ArrowLeftRight, group: NAV_GROUPS.hoje },
  { href: ROUTES.limits, label: NAV_LABELS.limits, icon: ShieldAlert, group: NAV_GROUPS.planejar },
  { href: ROUTES.assistant, label: NAV_LABELS.assistant, icon: Sparkles, group: NAV_GROUPS.entender },
  { href: ROUTES.cashflow, label: NAV_LABELS.cashflow, icon: Wallet, group: NAV_GROUPS.planejar },
  { href: ROUTES.goals, label: NAV_LABELS.goals, icon: Target, group: NAV_GROUPS.planejar },
  { href: ROUTES.investments, label: NAV_LABELS.investments, icon: Landmark, group: NAV_GROUPS.investir },
  { href: ROUTES.reports, label: NAV_LABELS.reports, icon: PieChart, group: NAV_GROUPS.entender },
]
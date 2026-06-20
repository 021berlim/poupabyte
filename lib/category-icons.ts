import {
  UtensilsCrossed,
  Car,
  Home,
  HeartPulse,
  GraduationCap,
  Gamepad2,
  TrendingUp,
  Wallet,
  Laptop,
  Repeat2,
  CircleHelp,
  MoreHorizontal,
  ShoppingBag,
  CreditCard,
  Split,
  AlertTriangle,
  Users,
  PawPrint,
  Receipt,
  Target,
  Banknote,
  RotateCcw,
  Truck,
  Sparkles,
  Gift,
  PiggyBank,
  ArrowLeftRight,
  Coins,
  LineChart,
  type LucideIcon,
} from "lucide-react"
import type { CategoryId, CategoryRef } from "./types"
import { isSystemCategoryId } from "./categories"

const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  salario: Wallet,
  "renda-extra": Banknote,
  reembolsos: RotateCcw,
  rendimentos: LineChart,
  "outras-receitas": Banknote,
  moradia: Home,
  alimentacao: UtensilsCrossed,
  transporte: Car,
  saude: HeartPulse,
  educacao: GraduationCap,
  lazer: Gamepad2,
  compras: ShoppingBag,
  assinaturas: Repeat2,
  familia: Users,
  pets: PawPrint,
  "cuidados-pessoais": Sparkles,
  "impostos-e-taxas": Receipt,
  dividas: AlertTriangle,
  "outros-gastos": MoreHorizontal,
  "reserva-emergencia": PiggyBank,
  investimentos: TrendingUp,
  objetivos: Target,
  aportes: TrendingUp,
  "cartao-credito": CreditCard,
  parcelamentos: Split,
  transferencias: ArrowLeftRight,
  "nao-categorizado": CircleHelp,
}

export function getCategoryIcon(id: CategoryRef): LucideIcon {
  if (isSystemCategoryId(id)) {
    return CATEGORY_ICONS[id] ?? CATEGORY_ICONS["nao-categorizado"]
  }
  return CATEGORY_ICONS["nao-categorizado"]
}
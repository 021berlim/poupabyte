export type TransactionType = "income" | "expense" | "transfer"

export type TransactionSource = "manual" | "pdf-import" | "recurring" | "fixed"

export type CategoryId =
  | "salario"
  | "renda-extra"
  | "reembolsos"
  | "rendimentos"
  | "outras-receitas"
  | "moradia"
  | "alimentacao"
  | "transporte"
  | "saude"
  | "educacao"
  | "lazer"
  | "compras"
  | "assinaturas"
  | "familia"
  | "pets"
  | "cuidados-pessoais"
  | "impostos-e-taxas"
  | "dividas"
  | "outros-gastos"
  | "reserva-emergencia"
  | "investimentos"
  | "objetivos"
  | "aportes"
  | "cartao-credito"
  | "parcelamentos"
  | "transferencias"
  | "nao-categorizado"

/** Referência de categoria: padrão do sistema ou personalizada (uc_*) */
export type CategoryRef = CategoryId | `uc_${string}`

export type CategoryKind = "income" | "expense" | "goal" | "investment" | "transfer"

export type CategoryGroup =
  | "receitas"
  | "despesas"
  | "planejamento"
  | "controle"

export interface UserCategory {
  id: `uc_${string}`
  name: string
  kind: CategoryKind
  /** Categoria pai (sistema ou personalizada) */
  parentId?: CategoryRef
  color?: string
  keywords?: string[]
  monthlyBudget?: number
  alertPercent?: number
  active: boolean
  isSubcategory: boolean
  /** Se foi duplicada de uma categoria padrão */
  basedOnSystemId?: CategoryId
}

export interface CategoryRule {
  id: string
  /** Padrão normalizado da descrição */
  pattern: string
  categoryId: CategoryRef
  subcategoryId?: `uc_${string}`
  type?: TransactionType
  usageCount: number
}

export interface Transaction {
  id: string
  type: TransactionType
  description: string
  amount: number
  category: CategoryRef
  subcategoryId?: `uc_${string}`
  date: string // ISO string
  source?: TransactionSource
  isFixed?: boolean
  isRecurring?: boolean
  isSubscription?: boolean
  isInstallment?: boolean
  recurrence?: TransactionRecurrence
  subscriptionId?: string
  needsReview?: boolean
  cardId?: string
}

export type FinancialObjective =
  | "controlar-gastos"
  | "reserva-emergencia"
  | "sair-dividas"
  | "organizar-salario"
  | "controlar-cartao"
  | "planejar-metas"
  | "entender-gastos"

export type SalaryEffectiveScope = "current-month" | "next-month" | "all-months"

export interface SalarySnapshot {
  effectiveFrom: string // YYYY-MM
  monthlySalary: number
  salaryDay: number
  expectedExtraIncome: number
  monthlyReserve: number
  objective: FinancialObjective
}

export interface FinancialProfile {
  monthlySalary: number
  salaryDay: number
  objective: FinancialObjective
  currency: "BRL"
  configured: boolean
  expectedExtraIncome: number
  monthlyReserve: number
  salaryHistory: SalarySnapshot[]
}

export interface ImportSummary {
  fileName: string
  importedAt: string
  totalFound: number
  importedCount: number
  incomeTotal: number
  expenseTotal: number
  autoCategorized: number
  pendingReview: number
  duplicates: number
  categoriesUpdated: number
}

export type SubscriptionFrequency = "monthly" | "yearly"

export type RecurrenceKind = "subscription" | "fixed" | "custom"

export type RecurrenceFrequency = "weekly" | "monthly" | "yearly"

export type RecurrenceDurationKind = "indefinite" | "until" | "count"

export interface TransactionRecurrence {
  kind: RecurrenceKind
  frequency: RecurrenceFrequency
  durationKind: RecurrenceDurationKind
  billingDay: number
  endDate?: string
  occurrenceCount?: number
}

export interface Subscription {
  id: string
  name: string
  amount: number
  category: CategoryRef
  billingDay: number
  frequency: SubscriptionFrequency
  active: boolean
}

export type InstallmentStatus = "active" | "completed"

export interface Installment {
  id: string
  name: string
  totalAmount: number
  installmentCount: number
  currentInstallment: number
  monthlyAmount: number
  category: CategoryRef
  startDate: string
  endDate: string
  cardId?: string
  status: InstallmentStatus
}

export interface CreditCard {
  id: string
  name: string
  closingDay: number
  dueDay: number
  active: boolean
}

export interface Goal {
  id: string
  name: string
  target: number
  current: number
  deadline: string // ISO date
  color: string
}

export interface SpendingLimit {
  id: string
  category: CategoryRef
  subcategoryId?: `uc_${string}`
  amount: number
  alertPercent?: number
}

export type InvestmentType =
  | "poupanca"
  | "cdb"
  | "tesouro-direto"
  | "acoes"
  | "fundos-imobiliarios"
  | "etfs"
  | "fundos"
  | "criptomoedas"
  | "previdencia"
  | "outros"

export type InvestmentMovementType = "contribution" | "withdrawal" | "value-update"

export interface InvestmentMovement {
  id: string
  investmentId: string
  type: InvestmentMovementType
  amount: number
  date: string // ISO string
  note?: string
  previousValue: number
  resultingValue: number
}

export interface Investment {
  id: string
  name: string
  type: InvestmentType
  institution: string
  investedAmount: number
  currentValue: number
  applicationDate: string // ISO string
  maturityDate?: string // ISO string
  expectedReturn?: number
  notes?: string
  movements: InvestmentMovement[]
}

export type NotificationType = "success" | "error" | "warning" | "info"

export type NotificationKind =
  | "success"
  | "error"
  | "warning"
  | "limit"
  | "goal"
  | "goal-done"
  | "transaction"
  | "investment"
  | "report"
  | "info"
  | "subscription"
  | "installment"
  | "planning"

export interface AppNotification {
  id: string
  kind: NotificationKind
  type: NotificationType
  title: string
  message: string
  date: string
  read: boolean
  dedupeKey?: string
}

export interface User {
  name: string
  email: string
  avatar?: string
  createdAt: string
}

export interface AppState {
  user: User | null
  /** false para contas novas até concluir ou pular o onboarding */
  onboardingCompleted: boolean
  financialProfile: FinancialProfile
  lastImport: ImportSummary | null
  transactions: Transaction[]
  goals: Goal[]
  limits: SpendingLimit[]
  subscriptions: Subscription[]
  installments: Installment[]
  creditCards: CreditCard[]
  investments: Investment[]
  notifications: AppNotification[]
  userCategories: UserCategory[]
  hiddenSystemCategories: CategoryId[]
  categoryRules: CategoryRule[]
}
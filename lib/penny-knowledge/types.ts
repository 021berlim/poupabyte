import type {
  AppNotification,
  CategoryId,
  CategoryRule,
  CreditCard,
  FinancialProfile,
  Goal,
  ImportSummary,
  Installment,
  Investment,
  SpendingLimit,
  Subscription,
  Transaction,
  UserCategory,
} from "../types"

export type PennyKnowledgeTopic =
  | "app"
  | "overview"
  | "planning"
  | "transactions"
  | "cashflow"
  | "goals"
  | "limits"
  | "investments"
  | "notifications"
  | "guidance"
  | "factual"
  | "assisted-write"

export type PennyDateRange = {
  from: string
  to: string
  label: string
  explicit: boolean
}

export type PennyDataSnapshot = {
  financialProfile: FinancialProfile
  lastImport?: ImportSummary | null
  transactions: Transaction[]
  goals: Goal[]
  limits: SpendingLimit[]
  subscriptions: Subscription[]
  installments: Installment[]
  creditCards: CreditCard[]
  investments: Investment[]
  notifications: AppNotification[]
  userCategories?: UserCategory[]
  hiddenSystemCategories?: CategoryId[]
  categoryRules?: CategoryRule[]
  previousHealthScore?: number
  mentionedAlertKeys?: ReadonlySet<string>
  pennyCreateTransactionsEnabled?: boolean
}

export type PennyQuestionAnalysis = {
  question: string
  normalizedQuestion: string
  topics: ReadonlySet<PennyKnowledgeTopic>
  inheritedTopics: ReadonlySet<PennyKnowledgeTopic>
  dateRange?: PennyDateRange
  categories: string[]
  broad: boolean
  appHelp: boolean
  followUp: boolean
  now: Date
}

export type PennyKnowledgeSourceMetadata = {
  id: string
  title: string
  description: string
  topics: PennyKnowledgeTopic[]
  availableInformation: string[]
  examples: string[]
  sourceOfTruth: string
}

export type PennyKnowledgeQueryResult = {
  data: unknown
  reason: string
  alertKeys?: string[]
}

export type PennyKnowledgeSource = PennyKnowledgeSourceMetadata & {
  shouldQuery: (analysis: PennyQuestionAnalysis) => boolean
  query: (snapshot: PennyDataSnapshot, analysis: PennyQuestionAnalysis) => PennyKnowledgeQueryResult
}

export type PennyKnowledgeContext = {
  generatedAt: string
  question: string
  routing: {
    selectedSources: Array<{
      id: string
      title: string
      reason: string
      sourceOfTruth: string
    }>
    dateRange?: Omit<PennyDateRange, "explicit">
    alertKeys: string[]
  }
  data: Record<string, unknown>
}

export type PennyKnowledgeQuery = {
  question: string
  previousUserQuestions?: string[]
  now?: Date
}

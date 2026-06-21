"use client"

import { createContext, useContext, useEffect, useReducer, useCallback, useMemo, useRef, type ReactNode } from "react"
import type {
  AppState,
  Transaction,
  Goal,
  SpendingLimit,
  AppNotification,
  User,
  CategoryId,
  CategoryRef,
  UserCategory,
  CategoryRule,
  Investment,
  InvestmentMovement,
  NotificationType,
  FinancialProfile,
  FinancialObjective,
  ImportSummary,
  SalaryEffectiveScope,
  Subscription,
  Installment,
  CreditCard,
} from "./types"
import { learnCategoryRule, suggestCategory } from "./auto-categorize"
import type { CategoryContext } from "./category-system"
import { findSimilarPending, isPendingReview } from "./transaction-utils"
import { applyIncomeUpdate, normalizeSalaryHistory, SALARY_SCOPE_LABELS } from "./income"
import { buildEmptyState, buildSeedState, EMPTY_FINANCIAL_PROFILE, DEMO_USER, generateId } from "./seed"
import { buildLongTermPlanning } from "./long-term-planning"
import { buildMonthlyPlanning, upcomingSubscriptions } from "./planning"
import { daysUntil, isSameMonth } from "./format"
import { getCategory } from "./categories"
import {
  validateGoal,
  validateInvestment,
  validateInvestmentMovement,
  validateLimit,
  validateTransaction,
} from "./finance"
import { goalProgress, investmentPerformance, investmentSummary } from "./selectors"
import { toast } from "sonner"

const DATA_KEY = "poupabyte:data"
const AUTH_KEY = "poupabyte:auth"
const USERS_KEY = "poupabyte:users"
const LEGACY_DATA_KEY = "finflow:data"
const LEGACY_AUTH_KEY = "finflow:auth"
const LEGACY_USERS_KEY = "finflow:users"
const LEGACY_DEMO_EMAIL = "joao.david@finflow.com"
const LEGACY_PRIMARY_COLOR = "#fb6018"
const PRIMARY_COLOR = "#c72c3b"

interface StoredUser extends User {
  password: string
}

type DataState = Omit<AppState, "user">

type NotificationPayload = Omit<AppNotification, "id" | "date" | "read"> & {
  persist?: boolean
}

type Action =
  | { type: "HYDRATE"; payload: { data: DataState; user: User | null } }
  | { type: "SET_USER"; payload: User | null }
  | { type: "ADD_TX"; payload: Transaction }
  | { type: "ADD_TXS"; payload: Transaction[] }
  | { type: "UPDATE_TX"; payload: Transaction }
  | { type: "UPDATE_TXS"; payload: Transaction[] }
  | { type: "DELETE_TX"; payload: string }
  | { type: "ADD_GOAL"; payload: Goal }
  | { type: "UPDATE_GOAL"; payload: Goal }
  | { type: "DELETE_GOAL"; payload: string }
  | { type: "SET_LIMIT"; payload: SpendingLimit }
  | { type: "DELETE_LIMIT"; payload: string }
  | { type: "ADD_INVESTMENT"; payload: Investment }
  | { type: "UPDATE_INVESTMENT"; payload: Investment }
  | { type: "DELETE_INVESTMENT"; payload: string }
  | { type: "SET_FINANCIAL_PROFILE"; payload: FinancialProfile }
  | { type: "SET_LAST_IMPORT"; payload: ImportSummary | null }
  | { type: "ADD_SUBSCRIPTION"; payload: Subscription }
  | { type: "UPDATE_SUBSCRIPTION"; payload: Subscription }
  | { type: "DELETE_SUBSCRIPTION"; payload: string }
  | { type: "ADD_INSTALLMENT"; payload: Installment }
  | { type: "UPDATE_INSTALLMENT"; payload: Installment }
  | { type: "DELETE_INSTALLMENT"; payload: string }
  | { type: "ADD_CREDIT_CARD"; payload: CreditCard }
  | { type: "UPDATE_CREDIT_CARD"; payload: CreditCard }
  | { type: "DELETE_CREDIT_CARD"; payload: string }
  | { type: "ADD_NOTIFICATION"; payload: AppNotification }
  | { type: "READ_NOTIFICATION"; payload: string }
  | { type: "READ_ALL_NOTIFICATIONS" }
  | { type: "DELETE_NOTIFICATION"; payload: string }
  | { type: "CLEAR_NOTIFICATIONS" }
  | { type: "SYNC_SYSTEM_ALERTS"; payload: NotificationPayload[] }
  | { type: "RESET_DEMO"; payload: DataState }
  | { type: "ADD_USER_CATEGORY"; payload: UserCategory }
  | { type: "UPDATE_USER_CATEGORY"; payload: UserCategory }
  | { type: "DELETE_USER_CATEGORY"; payload: string }
  | { type: "HIDE_SYSTEM_CATEGORY"; payload: CategoryId }
  | { type: "SHOW_SYSTEM_CATEGORY"; payload: CategoryId }
  | { type: "SET_CATEGORY_RULES"; payload: CategoryRule[] }
  | { type: "COMPLETE_ONBOARDING" }
  | { type: "SET_FINANCIAL_PROFILE_SILENT"; payload: FinancialProfile }
  | { type: "ADD_USER_CATEGORY_SILENT"; payload: UserCategory }

interface FullState extends DataState {
  user: User | null
  hydrated: boolean
}

const initialState: FullState = {
  user: null,
  onboardingCompleted: false,
  financialProfile: EMPTY_FINANCIAL_PROFILE,
  transactions: [],
  goals: [],
  limits: [],
  subscriptions: [],
  installments: [],
  creditCards: [],
  investments: [],
  lastImport: null,
  notifications: [],
  userCategories: [],
  hiddenSystemCategories: [],
  categoryRules: [],
  hydrated: false,
}

function reducer(state: FullState, action: Action): FullState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload.data, user: action.payload.user, hydrated: true }
    case "SET_USER":
      return { ...state, user: action.payload }
    case "ADD_TX":
      return { ...state, transactions: [action.payload, ...state.transactions] }
    case "ADD_TXS":
      return { ...state, transactions: [...action.payload, ...state.transactions] }
    case "UPDATE_TX":
      return {
        ...state,
        transactions: state.transactions.map((t) => (t.id === action.payload.id ? action.payload : t)),
      }
    case "UPDATE_TXS": {
      const byId = new Map(action.payload.map((tx) => [tx.id, tx]))
      return {
        ...state,
        transactions: state.transactions.map((t) => byId.get(t.id) ?? t),
      }
    }
    case "DELETE_TX":
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.payload) }
    case "ADD_GOAL":
      return { ...state, goals: [...state.goals, action.payload] }
    case "UPDATE_GOAL":
      return { ...state, goals: state.goals.map((g) => (g.id === action.payload.id ? action.payload : g)) }
    case "DELETE_GOAL":
      return { ...state, goals: state.goals.filter((g) => g.id !== action.payload) }
    case "SET_LIMIT": {
      const limitKey = `${action.payload.category}:${action.payload.subcategoryId ?? ""}`
      const exists = state.limits.some((l) => `${l.category}:${l.subcategoryId ?? ""}` === limitKey)
      return {
        ...state,
        limits: exists
          ? state.limits.map((l) =>
              `${l.category}:${l.subcategoryId ?? ""}` === limitKey ? action.payload : l,
            )
          : [...state.limits, action.payload],
      }
    }
    case "DELETE_LIMIT":
      return { ...state, limits: state.limits.filter((l) => l.id !== action.payload) }
    case "ADD_INVESTMENT":
      return { ...state, investments: [action.payload, ...state.investments] }
    case "UPDATE_INVESTMENT":
      return {
        ...state,
        investments: state.investments.map((investment) =>
          investment.id === action.payload.id ? action.payload : investment,
        ),
      }
    case "DELETE_INVESTMENT":
      return { ...state, investments: state.investments.filter((investment) => investment.id !== action.payload) }
    case "SET_FINANCIAL_PROFILE":
      return { ...state, financialProfile: action.payload }
    case "SET_LAST_IMPORT":
      return { ...state, lastImport: action.payload }
    case "ADD_SUBSCRIPTION":
      return { ...state, subscriptions: [...state.subscriptions, action.payload] }
    case "UPDATE_SUBSCRIPTION":
      return {
        ...state,
        subscriptions: state.subscriptions.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        ),
      }
    case "DELETE_SUBSCRIPTION":
      return { ...state, subscriptions: state.subscriptions.filter((item) => item.id !== action.payload) }
    case "ADD_INSTALLMENT":
      return { ...state, installments: [...state.installments, action.payload] }
    case "UPDATE_INSTALLMENT":
      return {
        ...state,
        installments: state.installments.map((item) => (item.id === action.payload.id ? action.payload : item)),
      }
    case "DELETE_INSTALLMENT":
      return { ...state, installments: state.installments.filter((item) => item.id !== action.payload) }
    case "ADD_CREDIT_CARD":
      return { ...state, creditCards: [...state.creditCards, action.payload] }
    case "UPDATE_CREDIT_CARD":
      return {
        ...state,
        creditCards: state.creditCards.map((item) => (item.id === action.payload.id ? action.payload : item)),
      }
    case "DELETE_CREDIT_CARD":
      return { ...state, creditCards: state.creditCards.filter((item) => item.id !== action.payload) }
    case "ADD_NOTIFICATION":
      if (
        action.payload.dedupeKey &&
        state.notifications.some((notification) => notification.dedupeKey === action.payload.dedupeKey)
      ) {
        return state
      }
      return { ...state, notifications: [action.payload, ...state.notifications] }
    case "READ_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.map((n) => (n.id === action.payload ? { ...n, read: true } : n)),
      }
    case "READ_ALL_NOTIFICATIONS":
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) }
    case "DELETE_NOTIFICATION":
      return { ...state, notifications: state.notifications.filter((n) => n.id !== action.payload) }
    case "CLEAR_NOTIFICATIONS":
      return { ...state, notifications: [] }
    case "SYNC_SYSTEM_ALERTS": {
      const activeKeys = new Set(
        action.payload.map((alert) => alert.dedupeKey).filter((key): key is string => Boolean(key)),
      )
      let notifications = state.notifications.filter((notification) => {
        if (!notification.dedupeKey || !isSystemDedupeKey(notification.dedupeKey)) return true
        return activeKeys.has(notification.dedupeKey)
      })
      const existingKeys = new Set(
        notifications.map((notification) => notification.dedupeKey).filter((key): key is string => Boolean(key)),
      )
      for (const alert of action.payload) {
        if (!alert.dedupeKey || existingKeys.has(alert.dedupeKey)) continue
        const payload: AppNotification = {
          ...alert,
          id: generateId("not"),
          date: new Date().toISOString(),
          read: false,
        }
        notifications = [payload, ...notifications]
        existingKeys.add(alert.dedupeKey)
      }
      return { ...state, notifications }
    }
    case "RESET_DEMO":
      return { ...state, ...action.payload }
    case "ADD_USER_CATEGORY":
      return { ...state, userCategories: [...state.userCategories, action.payload] }
    case "UPDATE_USER_CATEGORY":
      return {
        ...state,
        userCategories: state.userCategories.map((c) =>
          c.id === action.payload.id ? action.payload : c,
        ),
      }
    case "DELETE_USER_CATEGORY":
      return {
        ...state,
        userCategories: state.userCategories.filter((c) => c.id !== action.payload),
      }
    case "HIDE_SYSTEM_CATEGORY":
      if (state.hiddenSystemCategories.includes(action.payload)) return state
      return { ...state, hiddenSystemCategories: [...state.hiddenSystemCategories, action.payload] }
    case "SHOW_SYSTEM_CATEGORY":
      return {
        ...state,
        hiddenSystemCategories: state.hiddenSystemCategories.filter((id) => id !== action.payload),
      }
    case "SET_CATEGORY_RULES":
      return { ...state, categoryRules: action.payload }
    case "COMPLETE_ONBOARDING":
      return { ...state, onboardingCompleted: true }
    case "SET_FINANCIAL_PROFILE_SILENT":
      return { ...state, financialProfile: action.payload }
    case "ADD_USER_CATEGORY_SILENT":
      return { ...state, userCategories: [...state.userCategories, action.payload] }
    default:
      return state
  }
}

interface StoreContextValue extends FullState {
  // auth
  login: (email: string, password: string) => { ok: boolean; error?: string }
  register: (name: string, email: string, password: string) => { ok: boolean; error?: string; needsOnboarding?: boolean }
  resetPassword: (email: string) => { ok: boolean; error?: string }
  updateProfile: (profile: Pick<User, "name" | "email"> & { avatar?: string }) => { ok: boolean; error?: string }
  changePassword: (currentPassword: string, newPassword: string) => { ok: boolean; error?: string }
  logout: () => void
  // transactions
  addTransaction: (tx: Omit<Transaction, "id">) => void
  addTransactions: (transactions: Array<Omit<Transaction, "id">>) => number
  updateTransaction: (tx: Transaction) => void
  confirmSimilarTransactions: (sourceId: string) => number
  autoCategorizePendingTransactions: () => number
  deleteTransaction: (id: string) => void
  // goals
  addGoal: (goal: Omit<Goal, "id">) => void
  updateGoal: (goal: Goal) => void
  deleteGoal: (id: string) => void
  contributeGoal: (id: string, amount: number) => void
  // limits
  setLimit: (limit: Omit<SpendingLimit, "id"> & { id?: string }) => void
  deleteLimit: (id: string) => void
  // investments
  addInvestment: (investment: Omit<Investment, "id" | "movements">) => void
  updateInvestment: (investment: Investment) => void
  deleteInvestment: (id: string) => void
  setFinancialProfile: (profile: FinancialProfile) => void
  updateIncome: (
    input: {
      monthlySalary: number
      salaryDay: number
      expectedExtraIncome: number
      monthlyReserve: number
      objective: FinancialObjective
    },
    scope: SalaryEffectiveScope,
  ) => void
  setLastImport: (summary: ImportSummary | null) => void
  addSubscription: (subscription: Omit<Subscription, "id">) => void
  updateSubscription: (subscription: Subscription) => void
  deleteSubscription: (id: string) => void
  addInstallment: (installment: Omit<Installment, "id">) => void
  updateInstallment: (installment: Installment) => void
  deleteInstallment: (id: string) => void
  addCreditCard: (card: Omit<CreditCard, "id">) => void
  updateCreditCard: (card: CreditCard) => void
  deleteCreditCard: (id: string) => void
  addInvestmentMovement: (
    investmentId: string,
    movement: Omit<InvestmentMovement, "id" | "investmentId" | "previousValue" | "resultingValue">,
  ) => void
  // notifications
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  deleteNotification: (id: string) => void
  clearNotifications: () => void
  notify: (n: NotificationPayload) => void
  resetDemoData: () => void
  addUserCategory: (category: UserCategory) => void
  updateUserCategory: (category: UserCategory) => void
  deleteUserCategory: (id: string) => void
  hideSystemCategory: (id: CategoryId) => void
  showSystemCategory: (id: CategoryId) => void
  learnFromTransaction: (tx: Transaction) => void
  completeOnboarding: () => void
  saveOnboardingIncome: (input: {
    monthlySalary: number
    salaryDay: number
    expectedExtraIncome: number
  }) => void
  addUserCategorySilent: (category: UserCategory) => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

function storageGet(key: string): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function storageSet(key: string, value: string) {
  if (typeof window === "undefined" || !window.localStorage) return
  try {
    window.localStorage.setItem(key, value)
  } catch {}
}

function storageRemove(key: string) {
  if (typeof window === "undefined" || !window.localStorage) return
  try {
    window.localStorage.removeItem(key)
  } catch {}
}

function readUsers(): StoredUser[] {
  if (typeof window === "undefined") return []
  try {
    const raw = storageGet(USERS_KEY) ?? storageGet(LEGACY_USERS_KEY)
    if (raw) {
      return (JSON.parse(raw) as StoredUser[]).map((user) => {
        const isDemo = user.email.toLowerCase() === LEGACY_DEMO_EMAIL || user.email.toLowerCase() === DEMO_USER.email
        return {
          ...user,
          email: user.email.toLowerCase() === LEGACY_DEMO_EMAIL ? DEMO_USER.email : user.email,
          createdAt: user.createdAt ?? (isDemo ? DEMO_USER.createdAt : new Date().toISOString()),
        }
      })
    }
  } catch {}
  return []
}

function writeUsers(users: StoredUser[]) {
  storageSet(USERS_KEY, JSON.stringify(users))
}

function dataKeyForUser(email: string) {
  return `${DATA_KEY}:${email.toLowerCase()}`
}

function loadUserData(email: string): DataState {
  const userKey = dataKeyForUser(email)
  try {
    const userRaw = storageGet(userKey)
    if (userRaw) return normalizeData(JSON.parse(userRaw) as DataState)

    const legacyRaw = storageGet(DATA_KEY) ?? storageGet(LEGACY_DATA_KEY)
    if (legacyRaw) {
      const data = normalizeData(JSON.parse(legacyRaw) as DataState)
      storageSet(userKey, JSON.stringify(data))
      storageRemove(DATA_KEY)
      storageRemove(LEGACY_DATA_KEY)
      return data
    }
  } catch {}
  return buildEmptyState()
}

function persistUserData(email: string, data: DataState) {
  storageSet(dataKeyForUser(email), JSON.stringify(data))
}

function typeFromKind(kind: AppNotification["kind"]): NotificationType {
  if (kind === "error") return "error"
  if (kind === "warning" || kind === "limit" || kind === "goal") return "warning"
  if (kind === "success" || kind === "transaction" || kind === "investment") return "success"
  return "warning"
}

function isSystemDedupeKey(key: string): boolean {
  return (
    key.startsWith("limit:") ||
    key.startsWith("goal:") ||
    key.startsWith("investment:") ||
    key.startsWith("planning:") ||
    key.startsWith("subscription:")
  )
}

function isStoredAlert(notification: Partial<AppNotification>): boolean {
  if (notification.kind === "limit" || notification.kind === "goal") {
    return notification.type !== "success" && notification.type !== "error"
  }
  if (notification.kind === "goal-done") return true
  if (notification.kind === "investment" && notification.dedupeKey?.includes("expected-return")) return true
  if (notification.kind === "warning" && notification.dedupeKey) return true
  if (notification.kind === "report" && notification.dedupeKey) return true
  if (notification.kind === "planning" && notification.dedupeKey) return true
  if (notification.kind === "subscription" && notification.dedupeKey) return true
  if (notification.kind === "installment" && notification.dedupeKey) return true
  return false
}

function normalizeNotifications(notifications: unknown): AppNotification[] {
  if (!Array.isArray(notifications)) return []
  return notifications
    .filter((notification): notification is Partial<AppNotification> => typeof notification === "object" && notification !== null)
    .filter(isStoredAlert)
    .filter((notification) => {
      const kind = notification.kind ?? "info"
      if (["limit", "goal", "goal-done", "investment"].includes(kind) && !notification.dedupeKey) return false
      return true
    })
    .map((notification) => {
      const kind = notification.kind ?? "info"
      const type = notification.type ?? typeFromKind(kind)
      return {
        id: notification.id ?? generateId("not"),
        kind,
        type: type === "info" ? "warning" : type,
        title: notification.title ?? "Atualizacao",
        message: notification.message ?? "",
        date: notification.date ?? new Date().toISOString(),
        read: notification.read ?? false,
        dedupeKey: notification.dedupeKey,
      }
    })
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function normalizeInvestments(investments: unknown): Investment[] {
  if (!Array.isArray(investments)) return []
  return investments
    .filter((investment): investment is Partial<Investment> => typeof investment === "object" && investment !== null)
    .map((investment) => {
      const id = investment.id ?? generateId("inv")
      const movements = Array.isArray(investment.movements) ? investment.movements : []
      return {
        id,
        name: investment.name ?? "Investimento",
        type: investment.type ?? "outros",
        institution: investment.institution ?? "",
        investedAmount: finiteNumber(investment.investedAmount),
        currentValue: finiteNumber(investment.currentValue),
        applicationDate: investment.applicationDate ?? new Date().toISOString(),
        maturityDate: investment.maturityDate,
        expectedReturn: investment.expectedReturn,
        notes: investment.notes,
        movements: movements.map((movement) => ({
          id: movement.id ?? generateId("mov"),
          investmentId: movement.investmentId ?? id,
          type: movement.type ?? "value-update",
          amount: finiteNumber(movement.amount),
          date: movement.date ?? new Date().toISOString(),
          note: movement.note,
          previousValue: finiteNumber(movement.previousValue),
          resultingValue: finiteNumber(movement.resultingValue),
        })),
      }
    })
}

function normalizeThemeColors(data: DataState): DataState {
  return {
    ...data,
    goals: data.goals.map((goal) =>
      (goal.color ?? PRIMARY_COLOR).toLowerCase() === LEGACY_PRIMARY_COLOR
        ? { ...goal, color: PRIMARY_COLOR }
        : { ...goal, color: goal.color ?? PRIMARY_COLOR },
    ),
  }
}

function normalizeFinancialProfile(profile: unknown): FinancialProfile {
  if (!profile || typeof profile !== "object") return normalizeSalaryHistory(EMPTY_FINANCIAL_PROFILE)
  const value = profile as Partial<FinancialProfile>
  return normalizeSalaryHistory({
    monthlySalary: finiteNumber(value.monthlySalary, 0),
    salaryDay: Math.min(31, Math.max(1, finiteNumber(value.salaryDay, EMPTY_FINANCIAL_PROFILE.salaryDay))),
    objective: value.objective ?? EMPTY_FINANCIAL_PROFILE.objective,
    currency: "BRL",
    configured: value.configured ?? false,
    expectedExtraIncome: finiteNumber(value.expectedExtraIncome, 0),
    monthlyReserve: finiteNumber(value.monthlyReserve, 0),
    salaryHistory: Array.isArray(value.salaryHistory) ? value.salaryHistory : [],
  })
}

function normalizeSubscriptions(value: unknown): Subscription[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Partial<Subscription> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: item.id ?? generateId("sub"),
      name: item.name ?? "Assinatura",
      amount: finiteNumber(item.amount),
      category: item.category ?? "assinaturas",
      billingDay: Math.min(31, Math.max(1, finiteNumber(item.billingDay, 1))),
      frequency: item.frequency === "yearly" ? "yearly" : "monthly",
      active: item.active ?? true,
    }))
}

function normalizeInstallments(value: unknown): Installment[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Partial<Installment> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: item.id ?? generateId("inst"),
      name: item.name ?? "Parcelamento",
      totalAmount: finiteNumber(item.totalAmount),
      installmentCount: Math.max(1, finiteNumber(item.installmentCount, 1)),
      currentInstallment: Math.max(1, finiteNumber(item.currentInstallment, 1)),
      monthlyAmount: finiteNumber(item.monthlyAmount),
      category: item.category ?? "parcelamentos",
      startDate: item.startDate ?? new Date().toISOString(),
      endDate: item.endDate ?? new Date().toISOString(),
      cardId: item.cardId,
      status: item.status === "completed" ? "completed" : "active",
    }))
}

function normalizeCreditCards(value: unknown): CreditCard[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Partial<CreditCard> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: item.id ?? generateId("card"),
      name: item.name ?? "Cartão",
      closingDay: Math.min(31, Math.max(1, finiteNumber(item.closingDay, 1))),
      dueDay: Math.min(31, Math.max(1, finiteNumber(item.dueDay, 10))),
      active: item.active ?? true,
    }))
}

function normalizeLastImport(value: unknown): ImportSummary | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<ImportSummary>
  if (!item.fileName || !item.importedAt) return null
  return {
    fileName: item.fileName,
    importedAt: item.importedAt,
    totalFound: finiteNumber(item.totalFound),
    importedCount: finiteNumber(item.importedCount),
    incomeTotal: finiteNumber(item.incomeTotal),
    expenseTotal: finiteNumber(item.expenseTotal),
    autoCategorized: finiteNumber(item.autoCategorized),
    pendingReview: finiteNumber(item.pendingReview),
    duplicates: finiteNumber(item.duplicates),
    categoriesUpdated: finiteNumber(item.categoriesUpdated),
  }
}

function normalizeUserCategories(value: unknown): UserCategory[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Partial<UserCategory> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: (item.id?.startsWith("uc_") ? item.id : `uc_${item.id ?? generateId("cat")}`) as `uc_${string}`,
      name: item.name ?? "Categoria",
      kind: item.kind ?? "expense",
      parentId: item.parentId,
      color: item.color,
      keywords: Array.isArray(item.keywords) ? item.keywords : undefined,
      monthlyBudget: item.monthlyBudget,
      alertPercent: item.alertPercent,
      active: item.active ?? true,
      isSubcategory: item.isSubcategory ?? Boolean(item.parentId),
      basedOnSystemId: item.basedOnSystemId,
    }))
}

function normalizeCategoryRules(value: unknown): CategoryRule[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Partial<CategoryRule> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: item.id ?? generateId("rule"),
      pattern: item.pattern ?? "",
      categoryId: (item.categoryId ?? "nao-categorizado") as CategoryRef,
      subcategoryId: item.subcategoryId,
      type: item.type,
      usageCount: finiteNumber(item.usageCount, 1),
    }))
    .filter((item) => item.pattern.length >= 3)
}

function inferOnboardingCompleted(data: Partial<DataState>): boolean {
  if (typeof data.onboardingCompleted === "boolean") return data.onboardingCompleted
  const hasUsage =
    (Array.isArray(data.transactions) && data.transactions.length > 0) ||
    data.financialProfile?.configured === true ||
    (Array.isArray(data.userCategories) && data.userCategories.length > 0)
  return hasUsage
}

function normalizeData(data: Partial<DataState>): DataState {
  return normalizeThemeColors({
    onboardingCompleted: inferOnboardingCompleted(data),
    financialProfile: normalizeFinancialProfile(data.financialProfile),
    lastImport: normalizeLastImport(data.lastImport),
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    goals: Array.isArray(data.goals) ? data.goals : [],
    limits: Array.isArray(data.limits) ? data.limits : [],
    subscriptions: normalizeSubscriptions(data.subscriptions),
    installments: normalizeInstallments(data.installments),
    creditCards: normalizeCreditCards(data.creditCards),
    investments: normalizeInvestments(data.investments),
    notifications: normalizeNotifications(data.notifications),
    userCategories: normalizeUserCategories(data.userCategories),
    hiddenSystemCategories: Array.isArray(data.hiddenSystemCategories) ? data.hiddenSystemCategories : [],
    categoryRules: normalizeCategoryRules(data.categoryRules),
  })
}

function spentForLimit(transactions: Transaction[], limit: SpendingLimit): number {
  return transactions
    .filter((t) => {
      if (t.type !== "expense" || !isSameMonth(t.date)) return false
      if (limit.subcategoryId) return t.subcategoryId === limit.subcategoryId
      return t.category === limit.category
    })
    .reduce((acc, t) => acc + t.amount, 0)
}

function monthDedupe(prefix: string, date = new Date()): string {
  return `${prefix}:${date.getFullYear()}-${date.getMonth()}`
}

function limitAlert(limit: SpendingLimit, spent: number, ref = new Date()): NotificationPayload | null {
  const usage = limit.amount > 0 ? (spent / limit.amount) * 100 : 0
  if (usage < 71) return null
  const category = getCategory(limit.category)
  const remaining = limit.amount - spent
  const daysLeft = Math.max(1, new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate() - ref.getDate())
  const dailySuggestion = remaining > 0 ? remaining / daysLeft : 0
  const formattedDaily = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(dailySuggestion)
  const threshold = usage > 100 ? 100 : usage >= 91 ? 90 : 70
  const title =
    threshold === 100
      ? `Orçamento de ${category.label} estourado`
      : threshold === 90
        ? `Orçamento de ${category.label} crítico`
        : `Orçamento de ${category.label} em atenção`
  const message =
    threshold === 100
      ? `Você já usou ${Math.round(usage)}% do orçamento de ${category.label} e ultrapassou o planejado.`
      : `Você já usou ${Math.round(usage)}% do orçamento de ${category.label} e ainda faltam dias no mês. Tente limitar essa categoria a ${formattedDaily} por dia.`
  return {
    kind: "limit",
    type: "warning",
    title,
    message,
    dedupeKey: monthDedupe(`limit:${limit.id}:${threshold}`),
    persist: true,
  }
}

function goalAlert(goal: Goal): NotificationPayload | null {
  const progress = goalProgress(goal)
  if (goal.current >= goal.target) {
    return {
      kind: "goal-done",
      type: "warning",
      title: "Meta concluida",
      message: `Voce atingiu a meta "${goal.name}".`,
      dedupeKey: `goal:${goal.id}:done`,
      persist: true,
    }
  }

  const remainingDays = daysUntil(goal.deadline)
  if (progress.atRisk) {
    return {
      kind: "goal",
      type: "warning",
      title: "Meta em risco",
      message: `"${goal.name}" esta em ${progress.percent}% e precisa de ${progress.estimate} para cumprir o prazo.`,
      dedupeKey: monthDedupe(`goal:${goal.id}:risk`),
      persist: true,
    }
  }
  if (remainingDays >= 0 && remainingDays <= 7) {
    return {
      kind: "goal",
      type: "warning",
      title: "Meta proxima do vencimento",
      message: `"${goal.name}" esta em ${progress.percent}% e vence ${
        remainingDays === 0 ? "hoje" : `em ${remainingDays} dia(s)`
      }.`,
      dedupeKey: monthDedupe(`goal:${goal.id}:deadline`),
      persist: true,
    }
  }

  return null
}

function investmentAlert(investment: Investment): NotificationPayload | null {
  if (investment.expectedReturn === undefined) return null
  const { returnPercent } = investmentPerformance(investment)
  if (returnPercent < investment.expectedReturn) return null
  return {
    kind: "investment",
    type: "warning",
    title: "Rentabilidade esperada atingida",
    message: `"${investment.name}" atingiu a rentabilidade esperada.`,
    dedupeKey: `investment:${investment.id}:expected-return`,
    persist: true,
  }
}

function planningAlert(data: DataState): NotificationPayload | null {
  const planning = buildMonthlyPlanning(
    data.financialProfile,
    data.transactions,
    data.goals,
    data.subscriptions,
    data.installments,
    data.limits,
  )
  if (planning.projectedSavings >= 0) return null
  return {
    kind: "planning",
    type: "warning",
    title: "Mês com previsão negativa",
    message: `Com base no seu salário de ${planning.declaredSalary.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}, a projeção indica déficit de ${Math.abs(planning.projectedSavings).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} neste mês.`,
    dedupeKey: monthDedupe("planning:negative"),
    persist: true,
  }
}

function salaryAlert(data: DataState): NotificationPayload | null {
  const planning = buildMonthlyPlanning(
    data.financialProfile,
    data.transactions,
    data.goals,
    data.subscriptions,
    data.installments,
    data.limits,
  )
  if (!data.financialProfile.configured || planning.salaryReceived) return null
  const today = new Date().getDate()
  if (today < data.financialProfile.salaryDay) return null
  return {
    kind: "planning",
    type: "warning",
    title: "Salário ainda não registrado",
    message: `Você declarou recebimento no dia ${data.financialProfile.salaryDay}, mas ainda não há salário registrado neste mês.`,
    dedupeKey: monthDedupe("planning:salary-missing"),
    persist: true,
  }
}

function subscriptionAlert(subscriptions: Subscription[]): NotificationPayload | null {
  const upcoming = upcomingSubscriptions(subscriptions, 7)
  if (!upcoming.length) return null
  return {
    kind: "subscription",
    type: "warning",
    title: "Assinaturas próximas",
    message: `Você tem ${upcoming.length} assinatura(s) prevista(s) para os próximos 7 dias.`,
    dedupeKey: monthDedupe(`subscription:upcoming:${upcoming.map((s) => s.id).join(",")}`),
    persist: true,
  }
}

function pendingReviewAlert(transactions: Transaction[]): NotificationPayload | null {
  const pending = transactions.filter((t) => t.needsReview || t.category === "nao-categorizado")
  if (!pending.length) return null
  return {
    kind: "transaction",
    type: "warning",
    title: "Movimentações pendentes de revisão",
    message: `${pending.length} movimentação(ões) precisam de revisão ou categorização.`,
    dedupeKey: monthDedupe(`planning:pending-review:${pending.length}`),
    persist: true,
  }
}

function extraIncomeAlert(data: DataState): NotificationPayload | null {
  const planning = buildMonthlyPlanning(
    data.financialProfile,
    data.transactions,
    data.goals,
    data.subscriptions,
    data.installments,
    data.limits,
  )
  if (planning.extraIncomeDetected <= 100) return null
  return {
    kind: "planning",
    type: "warning",
    title: "Renda extra detectada",
    message: `Você recebeu ${planning.extraIncomeDetected.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de renda extra. Evite transformar isso em gasto fixo — use para acelerar objetivos, reforçar reserva ou reduzir dívidas.`,
    dedupeKey: monthDedupe("planning:extra-income"),
    persist: true,
  }
}

function safeMarginAlert(data: DataState): NotificationPayload | null {
  const longTerm = buildLongTermPlanning(
    data.financialProfile,
    data.transactions,
    data.goals,
    data.subscriptions,
    data.installments,
    data.limits,
  )
  if (longTerm.safeMargin >= 500) return null
  return {
    kind: "planning",
    type: "warning",
    title: "Margem segura apertada",
    message: `Com base apenas no salário fixo de ${longTerm.fixedSalary.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}, sua margem segura para novos compromissos é de ${longTerm.safeMargin.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
    dedupeKey: monthDedupe("planning:safe-margin"),
    persist: true,
  }
}

function fixedExpensesAlert(data: DataState): NotificationPayload | null {
  const longTerm = buildLongTermPlanning(
    data.financialProfile,
    data.transactions,
    data.goals,
    data.subscriptions,
    data.installments,
    data.limits,
  )
  if (longTerm.fixedExpensesPercent < 75) return null
  return {
    kind: "planning",
    type: "warning",
    title: "Despesas fixas elevadas",
    message: `Seus compromissos fixos comprometem ${longTerm.fixedExpensesPercent.toFixed(0)}% do salário fixo. Para decisões longas, considere apenas o salário de ${longTerm.fixedSalary.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
    dedupeKey: monthDedupe("planning:fixed-expenses"),
    persist: true,
  }
}

function reserveBelowPlannedAlert(data: DataState): NotificationPayload | null {
  const reserve = data.financialProfile.monthlyReserve ?? 0
  if (reserve <= 0) return null
  const planning = buildMonthlyPlanning(
    data.financialProfile,
    data.transactions,
    data.goals,
    data.subscriptions,
    data.installments,
    data.limits,
  )
  const reserveTx = data.transactions
    .filter((t) => t.type === "expense" && (t.category === "reserva-emergencia" || t.category === "aportes") && isSameMonth(t.date))
    .reduce((a, t) => a + t.amount, 0)
  if (reserveTx >= reserve * 0.5) return null
  return {
    kind: "planning",
    type: "warning",
    title: "Reserva mensal abaixo do planejado",
    message: `Você planejou guardar ${reserve.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por mês, mas ainda registrou apenas ${reserveTx.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} em reserva ou aportes.`,
    dedupeKey: monthDedupe("planning:reserve-below"),
    persist: true,
  }
}

function importSummaryAlert(data: DataState): NotificationPayload | null {
  const last = data.lastImport
  if (!last || last.pendingReview <= 0) return null
  const importedAt = new Date(last.importedAt)
  if (!isSameMonth(importedAt.toISOString())) return null
  return {
    kind: "transaction",
    type: "warning",
    title: "Itens pendentes após importação",
    message: `${last.pendingReview} movimentação(ões) de "${last.fileName}" ainda precisam de revisão.`,
    dedupeKey: monthDedupe(`planning:import-pending:${last.fileName}`),
    persist: true,
  }
}

function buildSystemAlerts(data: DataState): NotificationPayload[] {
  const alerts: NotificationPayload[] = []
  for (const limit of data.limits) {
    const alert = limitAlert(limit, spentForLimit(data.transactions, limit))
    if (alert) alerts.push(alert)
  }
  for (const goal of data.goals) {
    const alert = goalAlert(goal)
    if (alert) alerts.push(alert)
  }
  for (const investment of data.investments) {
    const alert = investmentAlert(investment)
    if (alert) alerts.push(alert)
  }
  const planning = planningAlert(data)
  if (planning) alerts.push(planning)
  const salary = salaryAlert(data)
  if (salary) alerts.push(salary)
  const subscription = subscriptionAlert(data.subscriptions)
  if (subscription) alerts.push(subscription)
  const pending = pendingReviewAlert(data.transactions)
  if (pending) alerts.push(pending)
  const extra = extraIncomeAlert(data)
  if (extra) alerts.push(extra)
  const importPending = importSummaryAlert(data)
  if (importPending) alerts.push(importPending)
  const safeMargin = safeMarginAlert(data)
  if (safeMargin) alerts.push(safeMargin)
  const fixedExpenses = fixedExpensesAlert(data)
  if (fixedExpenses) alerts.push(fixedExpenses)
  const reserveBelow = reserveBelowPlannedAlert(data)
  if (reserveBelow) alerts.push(reserveBelow)
  return alerts
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Hydrate from localStorage on mount
  useEffect(() => {
    let user: User | null = null
    try {
      const authRaw = storageGet(AUTH_KEY) ?? storageGet(LEGACY_AUTH_KEY)
      if (authRaw) {
        user = JSON.parse(authRaw)
        if (user?.email.toLowerCase() === LEGACY_DEMO_EMAIL) user = { ...user, email: DEMO_USER.email }
        if (user && !user.createdAt) {
          user = { ...user, createdAt: new Date().toISOString() }
        }
        storageSet(AUTH_KEY, JSON.stringify(user))
        storageRemove(LEGACY_AUTH_KEY)
      }
    } catch {}

    const data = user ? loadUserData(user.email) : buildEmptyState()
    dispatch({ type: "HYDRATE", payload: { data, user } })
  }, [])

  useEffect(() => {
    if (!state.hydrated) return
      dispatch({
      type: "SYNC_SYSTEM_ALERTS",
      payload: buildSystemAlerts({
        onboardingCompleted: state.onboardingCompleted,
        financialProfile: state.financialProfile,
        transactions: state.transactions,
        goals: state.goals,
        limits: state.limits,
        subscriptions: state.subscriptions,
        installments: state.installments,
        creditCards: state.creditCards,
        investments: state.investments,
        lastImport: state.lastImport,
        notifications: state.notifications,
        userCategories: state.userCategories,
        hiddenSystemCategories: state.hiddenSystemCategories,
        categoryRules: state.categoryRules,
      }),
    })
  }, [
    state.hydrated,
    state.transactions,
    state.goals,
    state.limits,
    state.investments,
    state.financialProfile,
    state.subscriptions,
    state.installments,
    state.lastImport,
    state.userCategories,
    state.categoryRules,
  ])

  // Persist data whenever it changes (after hydration)
  useEffect(() => {
    if (!state.hydrated || !state.user) return
    const data: DataState = {
      onboardingCompleted: state.onboardingCompleted,
      financialProfile: state.financialProfile,
      lastImport: state.lastImport,
      transactions: state.transactions,
      goals: state.goals,
      limits: state.limits,
      subscriptions: state.subscriptions,
      installments: state.installments,
      creditCards: state.creditCards,
      investments: state.investments,
      notifications: state.notifications,
      userCategories: state.userCategories,
      hiddenSystemCategories: state.hiddenSystemCategories,
      categoryRules: state.categoryRules,
    }
    persistUserData(state.user.email, data)
  }, [
    state.onboardingCompleted,
    state.financialProfile,
    state.transactions,
    state.goals,
    state.limits,
    state.subscriptions,
    state.installments,
    state.creditCards,
    state.investments,
    state.lastImport,
    state.notifications,
    state.userCategories,
    state.hiddenSystemCategories,
    state.categoryRules,
    state.hydrated,
    state.user,
  ])

  const notify = useCallback(
    (n: NotificationPayload) => {
      const { persist = false, ...notification } = n
      if (
        persist &&
        notification.dedupeKey &&
        state.notifications.some((item) => item.dedupeKey === notification.dedupeKey)
      ) {
        return
      }

      if (persist) {
        const payload = { ...notification, id: generateId("not"), date: new Date().toISOString(), read: false }
        dispatch({ type: "ADD_NOTIFICATION", payload })
      }

      const options = notification.message ? { description: notification.message } : undefined
      if (notification.type === "success") toast.success(notification.title, options)
      else if (notification.type === "error") toast.error(notification.title, options)
      else if (notification.type === "warning") toast.warning(notification.title, options)
      else toast.warning(notification.title, options)
    },
    [state.notifications],
  )

  const login = useCallback((email: string, password: string) => {
    const users = readUsers()
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (!found) return { ok: false, error: "E-mail não encontrado." }
    if (found.password !== password) return { ok: false, error: "Senha incorreta." }
    const user: User = {
      name: found.name,
      email: found.email,
      avatar: found.avatar,
      createdAt: found.createdAt,
    }
    storageSet(AUTH_KEY, JSON.stringify(user))
    const data = loadUserData(user.email)
    dispatch({ type: "HYDRATE", payload: { data, user } })
    return { ok: true }
  }, [])

  const register = useCallback((name: string, email: string, password: string) => {
    const users = readUsers()
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: "Este e-mail já está cadastrado." }
    }
    const newUser: StoredUser = { name, email, password, createdAt: new Date().toISOString() }
    users.push(newUser)
    writeUsers(users)
    const user: User = { name, email, createdAt: newUser.createdAt }
    const data = buildEmptyState()
    storageSet(AUTH_KEY, JSON.stringify(user))
    persistUserData(email, data)
    dispatch({ type: "HYDRATE", payload: { data, user } })
    return { ok: true, needsOnboarding: true }
  }, [])

  const resetPassword = useCallback((email: string) => {
    const users = readUsers()
    if (!users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: "E-mail não encontrado." }
    }
    return { ok: true }
  }, [])

  const updateProfile = useCallback(
    (profile: Pick<User, "name" | "email"> & { avatar?: string }) => {
      if (!state.user) return { ok: false, error: "Sessão não encontrada." }

      const name = profile.name.trim()
      const email = profile.email.trim().toLowerCase()
      if (!name) return { ok: false, error: "Informe o nome." }
      if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Informe um e-mail válido." }

      const users = readUsers()
      const currentIndex = users.findIndex((item) => item.email.toLowerCase() === state.user?.email.toLowerCase())
      if (currentIndex < 0) return { ok: false, error: "Conta não encontrada." }
      if (users.some((item, index) => index !== currentIndex && item.email.toLowerCase() === email)) {
        return { ok: false, error: "Este e-mail já está cadastrado." }
      }

      const updatedStoredUser: StoredUser = {
        ...users[currentIndex],
        name,
        email,
        avatar: profile.avatar ?? users[currentIndex].avatar,
      }
      users[currentIndex] = updatedStoredUser
      writeUsers(users)

      const updatedUser: User = {
        name,
        email,
        avatar: updatedStoredUser.avatar,
        createdAt: updatedStoredUser.createdAt,
      }
      storageSet(AUTH_KEY, JSON.stringify(updatedUser))
      dispatch({ type: "SET_USER", payload: updatedUser })
      return { ok: true }
    },
    [state.user],
  )

  const changePassword = useCallback(
    (currentPassword: string, newPassword: string) => {
      if (!state.user) return { ok: false, error: "Sessão não encontrada." }
      if (newPassword.length < 6) return { ok: false, error: "A nova senha deve ter ao menos 6 caracteres." }

      const users = readUsers()
      const currentIndex = users.findIndex((item) => item.email.toLowerCase() === state.user?.email.toLowerCase())
      if (currentIndex < 0) return { ok: false, error: "Conta não encontrada." }
      if (users[currentIndex].password !== currentPassword) return { ok: false, error: "Senha atual incorreta." }

      users[currentIndex] = { ...users[currentIndex], password: newPassword }
      writeUsers(users)
      return { ok: true }
    },
    [state.user],
  )

  const logout = useCallback(() => {
    storageRemove(AUTH_KEY)
    storageRemove(LEGACY_AUTH_KEY)
    dispatch({ type: "SET_USER", payload: null })
  }, [])

  const addTransaction = useCallback(
    (tx: Omit<Transaction, "id">) => {
      const errors = validateTransaction(tx)
      if (errors.length > 0) {
        notify({ kind: "error", type: "error", title: "Transacao invalida", message: errors[0] })
        return
      }

      const created = { ...tx, id: generateId("tx") }
      dispatch({ type: "ADD_TX", payload: created })
      notify({
        kind: "transaction",
        type: "success",
        title: "Transacao criada",
        message: `${tx.type === "income" ? "Receita" : "Despesa"} "${tx.description}" foi adicionada.`,
      })
      if (!created.needsReview && created.category !== "nao-categorizado") {
        const rules = learnCategoryRule(
          created.description,
          created.category,
          created.subcategoryId,
          created.type,
          state.categoryRules,
        )
        if (rules !== state.categoryRules) dispatch({ type: "SET_CATEGORY_RULES", payload: rules })
      }
      if (created.type === "expense") {
        const limit = state.limits.find(
          (l) =>
            l.category === created.category &&
            (l.subcategoryId ? l.subcategoryId === created.subcategoryId : !created.subcategoryId),
        )
        const alert = limit
          ? limitAlert(limit, spentForLimit([...state.transactions, created], limit))
          : null
        if (alert) notify(alert)
      }
    },
    [notify, state.limits, state.transactions, state.categoryRules],
  )

  const addTransactions = useCallback(
    (transactions: Array<Omit<Transaction, "id">>) => {
      const valid = transactions.filter((transaction) => validateTransaction(transaction).length === 0)
      if (valid.length === 0) {
        notify({
          kind: "error",
          type: "error",
          title: "Importação vazia",
          message: "Nenhuma transação válida foi selecionada.",
        })
        return 0
      }

      const created = valid.map((transaction) => ({ ...transaction, id: generateId("tx") }))
      dispatch({ type: "ADD_TXS", payload: created })
      notify({
        kind: "transaction",
        type: "success",
        title: "Extrato importado",
        message: `${created.length} ${created.length === 1 ? "transação foi adicionada" : "transações foram adicionadas"}.`,
      })
      return created.length
    },
    [notify],
  )

  const updateTransaction = useCallback(
    (tx: Transaction) => {
      const errors = validateTransaction(tx)
      if (errors.length > 0) {
        notify({ kind: "error", type: "error", title: "Transacao invalida", message: errors[0] })
        return
      }

      dispatch({ type: "UPDATE_TX", payload: tx })
      if (!tx.needsReview && tx.category !== "nao-categorizado") {
        const rules = learnCategoryRule(
          tx.description,
          tx.category,
          tx.subcategoryId,
          tx.type,
          state.categoryRules,
        )
        if (rules !== state.categoryRules) dispatch({ type: "SET_CATEGORY_RULES", payload: rules })
      }
      notify({
        kind: "transaction",
        type: "success",
        title: "Transacao editada",
        message: `"${tx.description}" foi atualizada.`,
      })
      if (tx.type === "expense") {
        const nextTransactions = state.transactions.map((t) => (t.id === tx.id ? tx : t))
        const limit = state.limits.find(
          (l) =>
            l.category === tx.category &&
            (l.subcategoryId ? l.subcategoryId === tx.subcategoryId : !tx.subcategoryId),
        )
        const alert = limit ? limitAlert(limit, spentForLimit(nextTransactions, limit)) : null
        if (alert) notify(alert)
      }
    },
    [notify, state.limits, state.transactions, state.categoryRules],
  )

  const confirmSimilarTransactions = useCallback(
    (sourceId: string) => {
      const source = state.transactions.find((tx) => tx.id === sourceId)
      if (!source || isPendingReview(source) === false) return 0
      if (source.category === "nao-categorizado") return 0

      const similar = findSimilarPending(state.transactions, source)
      if (!similar.length) return 0

      const updated = similar.map((tx) => ({
        ...tx,
        category: source.category,
        subcategoryId: source.subcategoryId,
        needsReview: false,
      }))

      dispatch({ type: "UPDATE_TXS", payload: updated })

      let rules = state.categoryRules
      for (const tx of updated) {
        rules = learnCategoryRule(tx.description, tx.category, tx.subcategoryId, tx.type, rules)
      }
      if (rules !== state.categoryRules) dispatch({ type: "SET_CATEGORY_RULES", payload: rules })

      notify({
        kind: "transaction",
        type: "success",
        title: "Lançamentos confirmados",
        message: `${updated.length} movimentação(ões) de ${source.description} foram confirmadas.`,
      })
      return updated.length
    },
    [notify, state.categoryRules, state.transactions],
  )

  const autoCategorizePendingTransactions = useCallback(() => {
    const ctx: CategoryContext = {
      userCategories: state.userCategories,
      hiddenSystemCategories: state.hiddenSystemCategories,
    }
    const pending = state.transactions.filter(isPendingReview)
    if (!pending.length) return 0

    const updated: Transaction[] = []
    for (const tx of pending) {
      const suggestion = suggestCategory(tx.description, tx.type, ctx, state.categoryRules)
      if (suggestion.category === "nao-categorizado" || suggestion.confidence < 0.75) continue
      const next: Transaction = {
        ...tx,
        category: suggestion.category,
        subcategoryId: suggestion.subcategoryId,
        needsReview: suggestion.confidence < 0.85,
      }
      if (
        next.category === tx.category &&
        next.subcategoryId === tx.subcategoryId &&
        Boolean(next.needsReview) === Boolean(tx.needsReview)
      ) {
        continue
      }
      updated.push(next)
    }

    if (!updated.length) return 0
    dispatch({ type: "UPDATE_TXS", payload: updated })
    return updated.length
  }, [state.categoryRules, state.hiddenSystemCategories, state.transactions, state.userCategories])

  const didAutoCategorizeOnHydrate = useRef(false)
  useEffect(() => {
    if (!state.hydrated || didAutoCategorizeOnHydrate.current) return
    didAutoCategorizeOnHydrate.current = true

    const ctx: CategoryContext = {
      userCategories: state.userCategories,
      hiddenSystemCategories: state.hiddenSystemCategories,
    }
    const pending = state.transactions.filter(isPendingReview)
    if (!pending.length) return

    const updated: Transaction[] = []
    for (const tx of pending) {
      const suggestion = suggestCategory(tx.description, tx.type, ctx, state.categoryRules)
      if (suggestion.category === "nao-categorizado" || suggestion.confidence < 0.75) continue
      const next: Transaction = {
        ...tx,
        category: suggestion.category,
        subcategoryId: suggestion.subcategoryId,
        needsReview: suggestion.confidence < 0.85,
      }
      if (
        next.category === tx.category &&
        next.subcategoryId === tx.subcategoryId &&
        Boolean(next.needsReview) === Boolean(tx.needsReview)
      ) {
        continue
      }
      updated.push(next)
    }

    if (updated.length) dispatch({ type: "UPDATE_TXS", payload: updated })
  }, [state.hydrated])

  const deleteTransaction = useCallback(
    (id: string) => {
      const removed = state.transactions.find((tx) => tx.id === id)
      dispatch({ type: "DELETE_TX", payload: id })
      notify({
        kind: "transaction",
        type: "success",
        title: "Transacao removida",
        message: removed ? `"${removed.description}" foi removida.` : "A movimentacao foi removida.",
      })
    },
    [notify, state.transactions],
  )

  const addGoal = useCallback(
    (goal: Omit<Goal, "id">) => {
      const errors = validateGoal(goal)
      if (errors.length > 0) {
        notify({ kind: "error", type: "error", title: "Meta invalida", message: errors[0] })
        return
      }

      const created = { ...goal, id: generateId("goal") }
      dispatch({ type: "ADD_GOAL", payload: created })
      notify({
        kind: "goal",
        type: "success",
        title: "Meta criada",
        message: `"${goal.name}" foi adicionada ao seu planejamento.`,
      })
      const alert = goalAlert(created)
      if (alert) notify(alert)
    },
    [notify],
  )

  const updateGoal = useCallback(
    (goal: Goal) => {
      const errors = validateGoal(goal)
      if (errors.length > 0) {
        notify({ kind: "error", type: "error", title: "Meta invalida", message: errors[0] })
        return
      }

      dispatch({ type: "UPDATE_GOAL", payload: goal })
      notify({
        kind: "goal",
        type: "success",
        title: "Meta atualizada",
        message: `"${goal.name}" foi atualizada.`,
      })
      const alert = goalAlert(goal)
      if (alert) notify(alert)
    },
    [notify],
  )

  const deleteGoal = useCallback(
    (id: string) => {
      const removed = state.goals.find((goal) => goal.id === id)
      dispatch({ type: "DELETE_GOAL", payload: id })
      notify({
        kind: "goal",
        type: "success",
        title: "Meta removida",
        message: removed ? `"${removed.name}" foi removida.` : "A meta foi removida.",
      })
    },
    [notify, state.goals],
  )

  const contributeGoal = useCallback(
    (id: string, amount: number) => {
      const goal = state.goals.find((g) => g.id === id)
      if (!goal) return
      if (!Number.isFinite(amount) || amount <= 0) {
        notify({ kind: "error", type: "error", title: "Valor invalido", message: "Informe um aporte maior que zero." })
        return
      }
      const updated = { ...goal, current: goal.current + amount }
      dispatch({ type: "UPDATE_GOAL", payload: updated })
      notify({
        kind: "goal",
        type: "success",
        title: "Aporte em meta registrado",
        message: `"${goal.name}" recebeu um novo aporte.`,
      })
      const alert = goalAlert(updated)
      if (alert) notify(alert)
    },
    [state.goals, notify],
  )

  const setLimit = useCallback(
    (limit: Omit<SpendingLimit, "id"> & { id?: string }) => {
      const errors = validateLimit(limit)
      if (errors.length > 0) {
        notify({ kind: "error", type: "error", title: "Orçamento invalido", message: errors[0] })
        return
      }

      const limitKey = `${limit.category}:${limit.subcategoryId ?? ""}`
      const exists = state.limits.some(
        (item) => item.id === limit.id || `${item.category}:${item.subcategoryId ?? ""}` === limitKey,
      )
      const payload = { ...limit, id: limit.id ?? generateId("lim") }
      dispatch({ type: "SET_LIMIT", payload })
      notify({
        kind: "limit",
        type: "success",
        title: exists ? "Orçamento atualizado" : "Orçamento criado",
        message: `O orçamento de ${getCategory(payload.category).label} foi ${exists ? "atualizado" : "definido"}.`,
      })
      const alert = limitAlert(payload, spentForLimit(state.transactions, payload))
      if (alert) notify(alert)
    },
    [notify, state.limits, state.transactions],
  )

  const deleteLimit = useCallback(
    (id: string) => {
      const removed = state.limits.find((limit) => limit.id === id)
      dispatch({ type: "DELETE_LIMIT", payload: id })
      notify({
        kind: "limit",
        type: "success",
        title: "Orçamento removido",
        message: removed ? `O orçamento de ${getCategory(removed.category).label} foi removido.` : "O orçamento foi removido.",
      })
    },
    [notify, state.limits],
  )

  const addInvestment = useCallback(
    (investment: Omit<Investment, "id" | "movements">) => {
      const errors = validateInvestment(investment)
      if (errors.length > 0) {
        notify({ kind: "error", type: "error", title: "Investimento invalido", message: errors[0] })
        return
      }

      const created: Investment = { ...investment, id: generateId("inv"), movements: [] }
      dispatch({ type: "ADD_INVESTMENT", payload: created })
      notify({
        kind: "investment",
        type: "success",
        title: "Investimento cadastrado",
        message: `"${created.name}" foi incluido na carteira.`,
      })
    },
    [notify],
  )

  const updateInvestment = useCallback(
    (investment: Investment) => {
      const errors = validateInvestment(investment)
      if (errors.length > 0) {
        notify({ kind: "error", type: "error", title: "Investimento invalido", message: errors[0] })
        return
      }

      dispatch({ type: "UPDATE_INVESTMENT", payload: investment })
      notify({
        kind: "investment",
        type: "success",
        title: "Investimento atualizado",
        message: `"${investment.name}" foi atualizado.`,
      })
    },
    [notify],
  )

  const deleteInvestment = useCallback(
    (id: string) => {
      const removed = state.investments.find((investment) => investment.id === id)
      dispatch({ type: "DELETE_INVESTMENT", payload: id })
      notify({
        kind: "investment",
        type: "success",
        title: "Investimento removido",
        message: removed ? `"${removed.name}" foi removido da carteira.` : "O investimento foi removido.",
      })
    },
    [notify, state.investments],
  )

  const setFinancialProfile = useCallback(
    (profile: FinancialProfile) => {
      if (!Number.isFinite(profile.monthlySalary) || profile.monthlySalary <= 0) {
        notify({ kind: "error", type: "error", title: "Salário inválido", message: "Informe um salário mensal maior que zero." })
        return
      }
      dispatch({ type: "SET_FINANCIAL_PROFILE", payload: normalizeSalaryHistory({ ...profile, configured: true, currency: "BRL" }) })
      notify({
        kind: "success",
        type: "success",
        title: "Planejamento atualizado",
        message: "Seu salário e configuração financeira foram salvos.",
      })
    },
    [notify],
  )

  const updateIncome = useCallback(
    (
      input: {
        monthlySalary: number
        salaryDay: number
        expectedExtraIncome: number
        monthlyReserve: number
        objective: FinancialObjective
      },
      scope: SalaryEffectiveScope,
    ) => {
      if (!Number.isFinite(input.monthlySalary) || input.monthlySalary <= 0) {
        notify({ kind: "error", type: "error", title: "Salário inválido", message: "Informe um salário mensal maior que zero." })
        return
      }
      const updated = applyIncomeUpdate(state.financialProfile, { ...input, scope })
      dispatch({ type: "SET_FINANCIAL_PROFILE", payload: updated })
      const formatted = input.monthlySalary.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      notify({
        kind: "success",
        type: "success",
        title: "Renda atualizada",
        message: `Salário de ${formatted} — ${SALARY_SCOPE_LABELS[scope]}. Percentuais, orçamentos e projeções foram recalculados.`,
      })
    },
    [notify, state.financialProfile],
  )

  const setLastImport = useCallback((summary: ImportSummary | null) => {
    dispatch({ type: "SET_LAST_IMPORT", payload: summary })
  }, [])

  const addSubscription = useCallback(
    (subscription: Omit<Subscription, "id">) => {
      const created = { ...subscription, id: generateId("sub") }
      dispatch({ type: "ADD_SUBSCRIPTION", payload: created })
      notify({ kind: "subscription", type: "success", title: "Assinatura cadastrada", message: `"${created.name}" foi adicionada ao planejamento.` })
    },
    [notify],
  )

  const updateSubscription = useCallback(
    (subscription: Subscription) => {
      dispatch({ type: "UPDATE_SUBSCRIPTION", payload: subscription })
      notify({ kind: "subscription", type: "success", title: "Assinatura atualizada", message: `"${subscription.name}" foi atualizada.` })
    },
    [notify],
  )

  const deleteSubscription = useCallback(
    (id: string) => {
      const removed = state.subscriptions.find((item) => item.id === id)
      dispatch({ type: "DELETE_SUBSCRIPTION", payload: id })
      notify({
        kind: "subscription",
        type: "success",
        title: "Assinatura removida",
        message: removed ? `"${removed.name}" foi removida.` : "A assinatura foi removida.",
      })
    },
    [notify, state.subscriptions],
  )

  const addInstallment = useCallback(
    (installment: Omit<Installment, "id">) => {
      const created = { ...installment, id: generateId("inst") }
      dispatch({ type: "ADD_INSTALLMENT", payload: created })
      notify({ kind: "installment", type: "success", title: "Parcelamento cadastrado", message: `"${created.name}" foi adicionado ao planejamento.` })
    },
    [notify],
  )

  const updateInstallment = useCallback(
    (installment: Installment) => {
      dispatch({ type: "UPDATE_INSTALLMENT", payload: installment })
      notify({ kind: "installment", type: "success", title: "Parcelamento atualizado", message: `"${installment.name}" foi atualizado.` })
    },
    [notify],
  )

  const deleteInstallment = useCallback(
    (id: string) => {
      const removed = state.installments.find((item) => item.id === id)
      dispatch({ type: "DELETE_INSTALLMENT", payload: id })
      notify({
        kind: "installment",
        type: "success",
        title: "Parcelamento removido",
        message: removed ? `"${removed.name}" foi removido.` : "O parcelamento foi removido.",
      })
    },
    [notify, state.installments],
  )

  const addCreditCard = useCallback(
    (card: Omit<CreditCard, "id">) => {
      const created = { ...card, id: generateId("card") }
      dispatch({ type: "ADD_CREDIT_CARD", payload: created })
      notify({ kind: "success", type: "success", title: "Cartão cadastrado", message: `"${created.name}" foi adicionado para controle.` })
    },
    [notify],
  )

  const updateCreditCard = useCallback(
    (card: CreditCard) => {
      dispatch({ type: "UPDATE_CREDIT_CARD", payload: card })
      notify({ kind: "success", type: "success", title: "Cartão atualizado", message: `"${card.name}" foi atualizado.` })
    },
    [notify],
  )

  const deleteCreditCard = useCallback(
    (id: string) => {
      const removed = state.creditCards.find((item) => item.id === id)
      dispatch({ type: "DELETE_CREDIT_CARD", payload: id })
      notify({
        kind: "success",
        type: "success",
        title: "Cartão removido",
        message: removed ? `"${removed.name}" foi removido.` : "O cartão foi removido.",
      })
    },
    [notify, state.creditCards],
  )

  const addInvestmentMovement = useCallback(
    (
      investmentId: string,
      movement: Omit<InvestmentMovement, "id" | "investmentId" | "previousValue" | "resultingValue">,
    ) => {
      const investment = state.investments.find((item) => item.id === investmentId)
      const errors = validateInvestmentMovement(movement, investment)
      if (errors.length > 0 || !investment) {
        notify({
          kind: "error",
          type: "error",
          title: "Movimentacao invalida",
          message: errors[0] ?? "Investimento nao encontrado.",
        })
        return
      }

      const previousValue = investment.currentValue
      const resultingValue =
        movement.type === "contribution"
          ? investment.currentValue + movement.amount
          : movement.type === "withdrawal"
            ? Math.max(0, investment.currentValue - movement.amount)
            : movement.amount
      const nextInvestedAmount =
        movement.type === "contribution"
          ? investment.investedAmount + movement.amount
          : movement.type === "withdrawal"
            ? Math.max(0, investment.investedAmount - movement.amount)
            : investment.investedAmount
      const createdMovement: InvestmentMovement = {
        ...movement,
        id: generateId("mov"),
        investmentId,
        previousValue,
        resultingValue,
      }
      const updated: Investment = {
        ...investment,
        investedAmount: nextInvestedAmount,
        currentValue: resultingValue,
        movements: [createdMovement, ...investment.movements],
      }

      dispatch({ type: "UPDATE_INVESTMENT", payload: updated })
      const label =
        movement.type === "contribution"
          ? "Aporte realizado"
          : movement.type === "withdrawal"
            ? "Resgate realizado"
            : "Valor atualizado"
      notify({
        kind: "investment",
        type: "success",
        title: label,
        message: `"${investment.name}" foi atualizado na carteira.`,
      })

      if (updated.expectedReturn !== undefined) {
        const performance = investmentSummary([updated])
        if (performance.accumulatedReturnPercent >= updated.expectedReturn) {
          notify({
            kind: "investment",
            type: "warning",
            title: "Rentabilidade esperada atingida",
            message: `"${updated.name}" atingiu a rentabilidade esperada.`,
            dedupeKey: `investment:${updated.id}:expected-return`,
            persist: true,
          })
        }
      }
    },
    [notify, state.investments],
  )

  const markNotificationRead = useCallback((id: string) => {
    dispatch({ type: "READ_NOTIFICATION", payload: id })
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    dispatch({ type: "READ_ALL_NOTIFICATIONS" })
  }, [])

  const deleteNotification = useCallback((id: string) => {
    dispatch({ type: "DELETE_NOTIFICATION", payload: id })
  }, [])

  const clearNotifications = useCallback(() => {
    dispatch({ type: "CLEAR_NOTIFICATIONS" })
  }, [])

  const resetDemoData = useCallback(() => {
    const demoData = buildSeedState()
    dispatch({ type: "RESET_DEMO", payload: demoData })
    if (state.user) persistUserData(state.user.email, demoData)
    notify({ kind: "success", type: "success", title: "Dados da demonstração restaurados.", message: "" })
  }, [notify, state.user])

  const addUserCategory = useCallback(
    (category: UserCategory) => {
      dispatch({ type: "ADD_USER_CATEGORY", payload: category })
      notify({
        kind: "success",
        type: "success",
        title: category.isSubcategory ? "Subcategoria criada" : "Categoria criada",
        message: `"${category.name}" foi adicionada.`,
      })
    },
    [notify],
  )

  const updateUserCategory = useCallback(
    (category: UserCategory) => {
      dispatch({ type: "UPDATE_USER_CATEGORY", payload: category })
      notify({
        kind: "success",
        type: "success",
        title: "Categoria atualizada",
        message: `"${category.name}" foi atualizada.`,
      })
    },
    [notify],
  )

  const deleteUserCategory = useCallback(
    (id: string) => {
      const removed = state.userCategories.find((c) => c.id === id)
      dispatch({ type: "DELETE_USER_CATEGORY", payload: id })
      notify({
        kind: "success",
        type: "success",
        title: "Categoria removida",
        message: removed ? `"${removed.name}" foi removida.` : "A categoria foi removida.",
      })
    },
    [notify, state.userCategories],
  )

  const hideSystemCategory = useCallback(
    (id: CategoryId) => {
      dispatch({ type: "HIDE_SYSTEM_CATEGORY", payload: id })
      notify({
        kind: "info",
        type: "warning",
        title: "Categoria oculta",
        message: `${getCategory(id).label} não aparecerá nas listas, mas transações antigas permanecem.`,
      })
    },
    [notify],
  )

  const showSystemCategory = useCallback(
    (id: CategoryId) => {
      dispatch({ type: "SHOW_SYSTEM_CATEGORY", payload: id })
    },
    [],
  )

  const learnFromTransaction = useCallback(
    (tx: Transaction) => {
      const rules = learnCategoryRule(
        tx.description,
        tx.category,
        tx.subcategoryId,
        tx.type,
        state.categoryRules,
      )
      if (rules !== state.categoryRules) dispatch({ type: "SET_CATEGORY_RULES", payload: rules })
    },
    [state.categoryRules],
  )

  const completeOnboarding = useCallback(() => {
    dispatch({ type: "COMPLETE_ONBOARDING" })
  }, [])

  const saveOnboardingIncome = useCallback(
    (input: { monthlySalary: number; salaryDay: number; expectedExtraIncome: number }) => {
      if (!Number.isFinite(input.monthlySalary) || input.monthlySalary <= 0) return
      const day = Number.isFinite(input.salaryDay) && input.salaryDay >= 1 && input.salaryDay <= 31 ? input.salaryDay : 1
      const updated = applyIncomeUpdate(
        state.financialProfile,
        {
          monthlySalary: input.monthlySalary,
          salaryDay: day,
          expectedExtraIncome: Math.max(0, input.expectedExtraIncome),
          monthlyReserve: state.financialProfile.monthlyReserve ?? 0,
          objective: state.financialProfile.objective,
          scope: "current-month",
        },
      )
      dispatch({ type: "SET_FINANCIAL_PROFILE_SILENT", payload: updated })
    },
    [state.financialProfile],
  )

  const addUserCategorySilent = useCallback((category: UserCategory) => {
    dispatch({ type: "ADD_USER_CATEGORY_SILENT", payload: category })
  }, [])

  const value = useMemo<StoreContextValue>(
    () => ({
      ...state,
      login,
      register,
      resetPassword,
      updateProfile,
      changePassword,
      logout,
      addTransaction,
      addTransactions,
      updateTransaction,
      confirmSimilarTransactions,
      autoCategorizePendingTransactions,
      deleteTransaction,
      addGoal,
      updateGoal,
      deleteGoal,
      contributeGoal,
      setLimit,
      deleteLimit,
      addInvestment,
      updateInvestment,
      deleteInvestment,
      setFinancialProfile,
      updateIncome,
      setLastImport,
      addSubscription,
      updateSubscription,
      deleteSubscription,
      addInstallment,
      updateInstallment,
      deleteInstallment,
      addCreditCard,
      updateCreditCard,
      deleteCreditCard,
      addInvestmentMovement,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      clearNotifications,
      notify,
      resetDemoData,
      addUserCategory,
      updateUserCategory,
      deleteUserCategory,
      hideSystemCategory,
      showSystemCategory,
      learnFromTransaction,
      completeOnboarding,
      saveOnboardingIncome,
      addUserCategorySilent,
    }),
    [
      state,
      login,
      register,
      resetPassword,
      updateProfile,
      changePassword,
      logout,
      addTransaction,
      addTransactions,
      updateTransaction,
      confirmSimilarTransactions,
      autoCategorizePendingTransactions,
      deleteTransaction,
      addGoal,
      updateGoal,
      deleteGoal,
      contributeGoal,
      setLimit,
      deleteLimit,
      addInvestment,
      updateInvestment,
      deleteInvestment,
      setFinancialProfile,
      updateIncome,
      setLastImport,
      addSubscription,
      updateSubscription,
      deleteSubscription,
      addInstallment,
      updateInstallment,
      deleteInstallment,
      addCreditCard,
      updateCreditCard,
      deleteCreditCard,
      addInvestmentMovement,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      clearNotifications,
      notify,
      resetDemoData,
      addUserCategory,
      updateUserCategory,
      deleteUserCategory,
      hideSystemCategory,
      showSystemCategory,
      learnFromTransaction,
      completeOnboarding,
      saveOnboardingIncome,
      addUserCategorySilent,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}

import { appCapabilitiesSource } from "./sources/app-capabilities"
import { cashflowSource } from "./sources/cashflow"
import { goalsSource } from "./sources/goals"
import { investmentsSource } from "./sources/investments"
import { limitsSource } from "./sources/limits"
import { notificationsSource } from "./sources/notifications"
import { overviewSource } from "./sources/overview"
import { planningSource } from "./sources/planning"
import { transactionsSource } from "./sources/transactions"
import type { PennyKnowledgeSource } from "./types"

export const PENNY_KNOWLEDGE_SOURCES: readonly PennyKnowledgeSource[] = [
  appCapabilitiesSource,
  overviewSource,
  planningSource,
  transactionsSource,
  cashflowSource,
  goalsSource,
  limitsSource,
  investmentsSource,
  notificationsSource,
]

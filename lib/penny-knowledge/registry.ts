import { assistedWriteSource } from "./sources/assisted-write"
import { appCapabilitiesSource } from "./sources/app-capabilities"
import { cashflowSource } from "./sources/cashflow"
import { factualKnowledgeSource } from "./sources/factual-knowledge"
import { financialGuidanceSource } from "./sources/financial-guidance"
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
  assistedWriteSource,
  financialGuidanceSource,
  factualKnowledgeSource,
  transactionsSource,
  cashflowSource,
  goalsSource,
  limitsSource,
  investmentsSource,
  notificationsSource,
]

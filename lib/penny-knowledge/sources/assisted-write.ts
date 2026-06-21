import { buildAssistedWritePlan, hasAssistedWriteIntent } from "../../penny-assisted-write"
import { CATEGORY_LIST } from "../../categories"
import { isPendingReview } from "../../transaction-utils"
import { presentTransaction } from "../query-utils"
import type { PennyKnowledgeSource } from "../types"

export const assistedWriteSource: PennyKnowledgeSource = {
  id: "assisted-write",
  title: "Escrita assistida de lançamentos",
  description:
    "Organização de lançamentos existentes: categorizar, recategorizar e confirmar pendentes com confirmação explícita.",
  topics: ["assisted-write"],
  availableInformation: [
    "lançamentos pendentes com id",
    "plano de categorização ou confirmação",
    "texto de confirmação sugerido",
    "categorias disponíveis",
  ],
  examples: [
    "Categoriza os lançamentos da Uber como Transporte",
    "Confirma os pendentes do iFood",
    "Marca esses como alimentação",
  ],
  sourceOfTruth: "poupabyte:data.transactions",
  shouldQuery: (analysis) => hasAssistedWriteIntent(analysis.question),
  query: (snapshot, analysis) => {
    const plan = buildAssistedWritePlan(
      snapshot.transactions,
      analysis.question,
      snapshot.userCategories ?? [],
    )
    const pending = snapshot.transactions
      .filter(isPendingReview)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 40)
      .map(presentTransaction)

    return {
      reason: "A pergunta solicita organização assistida de lançamentos já existentes.",
      data: {
        capabilityGroup: "assisted-write",
        executable: Boolean(plan?.transactionIds.length),
        awaitingExplicitConfirmation: true,
        plan,
        pendingTransactions: pending,
        pendingCount: pending.length,
        protocol: {
          step1: "Apresente exatamente o plano (quantidade, categoria, estabelecimento) usando plan.summary e plan.confirmationPrompt.",
          step2: "Aguarde confirmação explícita do usuário (sim, confirma, pode fazer).",
          step3: "O app executa applyAssistedWritePlan no cliente após a confirmação — você não precisa inventar que já executou antes da confirmação.",
          step4: "Se plan for null ou transactionIds vazio, diga que não encontrou lançamentos compatíveis e oriente revisar em Movimentações.",
        },
        availableCategories: CATEGORY_LIST.filter(
          (category) => category.defaultType === "expense" || category.defaultType === "both",
        ).map((category) => ({ id: category.id, label: category.label })),
      },
    }
  },
}
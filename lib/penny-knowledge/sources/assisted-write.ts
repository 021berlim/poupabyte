import {
  buildAssistedWritePlan,
  hasAssistedWriteIntent,
  hasCreateIntent,
} from "../../penny-assisted-write"
import { CATEGORY_LIST } from "../../categories"
import { isPendingReview } from "../../transaction-utils"
import { presentTransaction } from "../query-utils"
import type { PennyKnowledgeSource } from "../types"

export const assistedWriteSource: PennyKnowledgeSource = {
  id: "assisted-write",
  title: "Escrita assistida de lançamentos",
  description:
    "Organização de lançamentos existentes e criação assistida de novos lançamentos, sempre com confirmação explícita.",
  topics: ["assisted-write"],
  availableInformation: [
    "lançamentos pendentes com id",
    "plano de categorização, confirmação ou criação",
    "texto de confirmação sugerido",
    "categorias disponíveis",
    "preferência de criação assistida na conta",
  ],
  examples: [
    "Categoriza os lançamentos da Uber como Transporte",
    "Confirma os pendentes do iFood",
    "Registra uma despesa de R$ 45 no mercado",
  ],
  sourceOfTruth: "poupabyte:data.transactions",
  shouldQuery: (analysis) => hasAssistedWriteIntent(analysis.question),
  query: (snapshot, analysis) => {
    const createEnabled = snapshot.pennyCreateTransactionsEnabled ?? false
    const plan = buildAssistedWritePlan(
      snapshot.transactions,
      analysis.question,
      snapshot.userCategories ?? [],
      { createEnabled },
    )
    const pending = snapshot.transactions
      .filter(isPendingReview)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 40)
      .map(presentTransaction)

    const isCreatePlan = plan?.action === "create"
    const executable = isCreatePlan
      ? Boolean(createEnabled && plan?.proposedTransaction)
      : Boolean(plan?.transactionIds.length)

    return {
      reason: isCreatePlan
        ? "A pergunta solicita criação assistida de um novo lançamento."
        : "A pergunta solicita organização assistida de lançamentos já existentes.",
      data: {
        capabilityGroup: "assisted-write",
        executable,
        awaitingExplicitConfirmation: true,
        createTransactionsEnabled: createEnabled,
        createIntentDetected: hasCreateIntent(analysis.question),
        plan,
        pendingTransactions: pending,
        pendingCount: pending.length,
        protocol: {
          step1: isCreatePlan
            ? "Apresente exatamente o lançamento proposto (tipo, valor, descrição, data, categoria) usando plan.summary e plan.confirmationPrompt."
            : "Apresente exatamente o plano (quantidade, categoria, estabelecimento) usando plan.summary e plan.confirmationPrompt.",
          step2: "Aguarde confirmação explícita do usuário (sim, confirma, pode fazer). Um lançamento novo por confirmação — nunca em lote.",
          step3: isCreatePlan
            ? "O app executa a criação no cliente após a confirmação — você não precisa inventar que já registrou antes da confirmação."
            : "O app executa applyAssistedWritePlan no cliente após a confirmação — você não precisa inventar que já executou antes da confirmação.",
          step4: isCreatePlan
            ? createEnabled
              ? "Se plan.proposedTransaction estiver ausente, peça valor e descrição objetivos antes de propor."
              : "Se createTransactionsEnabled for false, oriente ativar em Minha conta → Preferências e não diga que registrou."
            : "Se plan for null ou transactionIds vazio, diga que não encontrou lançamentos compatíveis e oriente revisar em Movimentações.",
        },
        availableCategories: CATEGORY_LIST.filter(
          (category) => category.defaultType === "expense" || category.defaultType === "both",
        ).map((category) => ({ id: category.id, label: category.label })),
      },
    }
  },
}
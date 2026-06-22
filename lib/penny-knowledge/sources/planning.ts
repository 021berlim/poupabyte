import { buildLongTermPlanning } from "../../long-term-planning"
import { buildMonthlyPlanning, upcomingSubscriptions, activeInstallmentsMonthlyTotal, activeSubscriptionsMonthlyTotal } from "../../planning"
import { limitUsage } from "../../selectors"
import type { PennyKnowledgeSource } from "../types"

export const planningSource: PennyKnowledgeSource = {
  id: "monthly-planning",
  title: "Planejamento mensal pessoal",
  description: "Salário declarado, orçamento, assinaturas, parcelamentos e quanto ainda pode gastar com segurança.",
  topics: ["planning", "overview", "cashflow"],
  availableInformation: [
    "salário declarado e renda recebida",
    "despesas confirmadas e comprometidas",
    "quanto ainda pode gastar com segurança",
    "orçamento por categoria",
    "assinaturas e parcelamentos",
    "metas e reserva mensal",
    "projeção de economia do mês",
  ],
  examples: [
    "Quanto ainda posso gastar este mês?",
    "Meu salário cobre meus gastos?",
    "Quais assinaturas estão pesando?",
    "Quais parcelamentos comprometem os próximos meses?",
  ],
  sourceOfTruth: "financialProfile, transactions, limits, subscriptions, installments e goals",
  shouldQuery: (analysis) =>
    analysis.broad ||
    analysis.topics.has("planning") ||
    analysis.topics.has("cashflow") ||
    /\b(salario|salário|orcamento|orçamento|sobra|disponivel|disponível|comprometido|assinatura|parcela|cartao|cartão|planejamento|importacao|importação|pdf)\b/.test(
      analysis.normalizedQuestion,
    ),
  query: (snapshot, analysis) => {
    const planning = buildMonthlyPlanning(
      snapshot.financialProfile,
      snapshot.transactions,
      snapshot.goals,
      snapshot.subscriptions,
      snapshot.installments,
      snapshot.limits,
      analysis.now,
      snapshot.lastImport ?? null,
    )
    const longTerm = buildLongTermPlanning(
      snapshot.financialProfile,
      snapshot.transactions,
      snapshot.goals,
      snapshot.subscriptions,
      snapshot.installments,
      snapshot.limits,
      analysis.now,
    )
    const budgets = limitUsage(snapshot.limits, snapshot.transactions, analysis.now)
    const upcoming = upcomingSubscriptions(snapshot.subscriptions, 7, analysis.now)

    return {
      reason: "A pergunta envolve planejamento mensal, salário, orçamento ou compromissos futuros.",
      data: {
        incomeDecisionRules: {
          shortTermUses:
            "extrato importado com movimentações confirmadas; safeToSpend prioriza saldo disponível do extrato",
          projectedUses:
            "salário declarado só entra após confirmação do recebimento nas movimentações do mês atual",
          longTermUses: "apenas salário fixo declarado",
          extraIncomeGuidance:
            "Renda extra detectada no extrato pode ajudar no mês, mas não deve sustentar compromissos longos recorrentes.",
        },
        longTermPlanning: longTerm,
        financialProfile: {
          monthlySalary: snapshot.financialProfile.monthlySalary,
          salaryDay: snapshot.financialProfile.salaryDay,
          objective: snapshot.financialProfile.objective,
          configured: snapshot.financialProfile.configured,
          expectedExtraIncome: snapshot.financialProfile.expectedExtraIncome,
          monthlyReserve: snapshot.financialProfile.monthlyReserve,
          salaryHistory: snapshot.financialProfile.salaryHistory,
        },
        incomeBreakdown: {
          declaredSalary: planning.declaredSalary,
          fixedSalary: planning.fixedSalary,
          monthlyIncome: planning.monthlyIncome,
          receivedIncome: planning.receivedIncome,
          extraDetected: planning.extraIncomeDetected,
          expectedExtra: planning.expectedExtraIncome,
          salaryPortion: planning.salaryPortionReceived,
        },
        lastImport: snapshot.lastImport,
        monthlyPlanning: planning,
        subscriptions: {
          activeMonthlyTotal: activeSubscriptionsMonthlyTotal(snapshot.subscriptions),
          upcomingNext7Days: upcoming.map((item) => ({
            name: item.name,
            amount: item.amount,
            billingDay: item.billingDay,
          })),
        },
        installments: {
          activeMonthlyCommitment: activeInstallmentsMonthlyTotal(snapshot.installments),
          items: snapshot.installments
            .filter((item) => item.status === "active")
            .map((item) => ({
              name: item.name,
              currentInstallment: item.currentInstallment,
              installmentCount: item.installmentCount,
              monthlyAmount: item.monthlyAmount,
              endDate: item.endDate,
            })),
        },
        creditCards: snapshot.creditCards.map((card) => ({
          name: card.name,
          closingDay: card.closingDay,
          dueDay: card.dueDay,
          active: card.active,
        })),
        budgets: budgets.map((item) => ({
          category: item.limit.category,
          planned: item.limit.amount,
          spent: item.spent,
          remaining: item.remaining,
          usagePercent: item.percent,
          status: item.status,
          dailySuggestion: item.dailySuggestion,
        })),
        pendingReviewCount: snapshot.transactions.filter(
          (tx) => tx.needsReview || tx.category === "nao-categorizado",
        ).length,
        importedThisMonth: snapshot.transactions.filter(
          (tx) => tx.source === "pdf-import" && tx.date.slice(0, 7) === analysis.now.toISOString().slice(0, 7),
        ).length,
      },
    }
  },
}
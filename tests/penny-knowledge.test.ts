import { describe, expect, it } from "vitest"
import { PENNY_KNOWLEDGE_CATALOG, analyzePennyQuestion, queryPennyKnowledge } from "../lib/penny-knowledge"
import type { PennyDataSnapshot } from "../lib/penny-knowledge"
import { normalizePennyText, topicsForQuestion } from "../lib/penny-knowledge/query-utils"
import { DEFAULT_FINANCIAL_PROFILE } from "../lib/seed"

const NOW = new Date("2026-06-19T12:00:00-03:00")

function snapshot(): PennyDataSnapshot {
  return {
    financialProfile: DEFAULT_FINANCIAL_PROFILE,
    subscriptions: [],
    installments: [],
    creditCards: [],
    transactions: [
      { id: "tx-1", type: "expense", description: "Supermercado", amount: 320, category: "alimentacao", date: "2026-06-10T12:00:00.000Z" },
      { id: "tx-2", type: "income", description: "Salário", amount: 5000, category: "salario", date: "2026-06-05T12:00:00.000Z" },
      { id: "tx-3", type: "expense", description: "Restaurante", amount: 180, category: "alimentacao", date: "2026-05-15T12:00:00.000Z" },
      { id: "tx-4", type: "expense", description: "Aluguel", amount: 1500, category: "moradia", date: "2026-05-03T12:00:00.000Z" },
    ],
    goals: [
      { id: "goal-1", name: "Viagem", target: 5000, current: 2500, deadline: "2026-12-01T12:00:00.000Z", color: "#000" },
    ],
    limits: [
      { id: "limit-1", category: "alimentacao", amount: 600 },
    ],
    investments: [
      {
        id: "investment-1",
        name: "CDB Liquidez",
        type: "cdb",
        institution: "Banco Byte",
        investedAmount: 1000,
        currentValue: 1100,
        applicationDate: "2026-01-10T12:00:00.000Z",
        expectedReturn: 8,
        movements: [
          {
            id: "movement-1",
            investmentId: "investment-1",
            type: "contribution",
            amount: 200,
            date: "2026-05-08T12:00:00.000Z",
            previousValue: 800,
            resultingValue: 1000,
          },
        ],
      },
    ],
    notifications: [
      {
        id: "notification-1",
        kind: "limit",
        type: "warning",
        title: "Limite em alerta",
        message: "O limite de alimentação está próximo.",
        date: "2026-06-18T12:00:00.000Z",
        read: false,
      },
    ],
  }
}

function sourceIds(question: string, previousUserQuestions: string[] = []) {
  return queryPennyKnowledge(snapshot(), { question, previousUserQuestions, now: NOW })
    .routing.selectedSources.map((source) => source.id)
}

describe("P.E.N.N.Y knowledge catalog", () => {
  it("registers unique and documented sources", () => {
    const ids = PENNY_KNOWLEDGE_CATALOG.map((source) => source.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(expect.arrayContaining([
      "app-capabilities",
      "financial-overview",
      "monthly-planning",
      "transactions",
      "cashflow",
      "goals",
      "limits",
      "investments",
      "notifications",
    ]))
    expect(PENNY_KNOWLEDGE_CATALOG.every((source) => source.availableInformation.length > 0)).toBe(true)
  })

  it("selects only transactions for a category spending question", () => {
    const context = queryPennyKnowledge(snapshot(), {
      question: "Quanto gastei com alimentação no mês passado?",
      now: NOW,
    })
    expect(context.routing.selectedSources.map((source) => source.id)).toEqual(["transactions"])
    expect(context.routing.dateRange).toMatchObject({ from: "2026-05-01", to: "2026-05-31" })
    const data = context.data.transactions as { resultCount: number; appliedFilters: { categories: string[] } }
    expect(data.resultCount).toBe(1)
    expect(data.appliedFilters.categories).toEqual(["Alimentação"])
  })

  it("inherits the previous domain for an elliptical follow-up", () => {
    expect([...topicsForQuestion(normalizePennyText("E no mês anterior?"))]).toEqual([])
    expect([...topicsForQuestion(normalizePennyText("Como está minha carteira de investimentos?"))]).toEqual(["investments"])
    expect([...analyzePennyQuestion("E no mês anterior?", ["Como está minha carteira de investimentos?"], NOW).topics]).toEqual(["investments"])
    expect(sourceIds("E no mês anterior?", ["Como está minha carteira de investimentos?"])).toEqual(["investments"])
  })

  it("does not inherit an unrelated domain when the new question is explicit", () => {
    expect(sourceIds("Quanto falta para minha meta?", ["Como está minha carteira de investimentos?"])).toEqual(["goals"])
  })

  it("routes navigation questions to app capabilities without financial records", () => {
    expect(sourceIds("Onde vejo minhas metas?")).toEqual(["app-capabilities"])
  })

  it("uses the consolidated source for a broad overview", () => {
    expect(sourceIds("Dê um panorama geral das minhas finanças.")).toEqual(
      expect.arrayContaining(["financial-overview", "monthly-planning"]),
    )
  })

  it("routes alerts to persisted notifications", () => {
    expect(sourceIds("Quais alertas não lidos eu tenho?")).toEqual(["notifications"])
  })

  it("does not attach unrelated data when no source matches", () => {
    const context = queryPennyKnowledge(snapshot(), { question: "Qual é a cor favorita?", now: NOW })
    expect(context.routing.selectedSources).toEqual([])
    expect(context.data).toEqual({})
  })

  it("never serializes identity or profile fields", () => {
    const context = queryPennyKnowledge(snapshot(), { question: "Dê um panorama geral.", now: NOW })
    const serialized = JSON.stringify(context).toLowerCase()
    expect(serialized).not.toContain('"user"')
    expect(serialized).not.toContain('"profile"')
    expect(serialized).not.toContain('"email"')
    expect(serialized).not.toContain('"avatar"')
  })
})

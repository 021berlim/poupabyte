import { goalProgress, goalSummary } from "../../selectors"
import type { PennyKnowledgeSource } from "../types"

export const goalsSource: PennyKnowledgeSource = {
  id: "goals",
  title: "Objetivos",
  description: "Objetivos financeiros e cálculos de progresso e prazo.",
  topics: ["goals"],
  availableInformation: ["nome", "valor-alvo", "valor atual", "prazo", "progresso", "risco", "aporte diário necessário"],
  examples: ["Quanto falta para minha viagem?", "Quais metas estão em risco?", "Quanto preciso guardar por dia?"],
  sourceOfTruth: "poupabyte:data.goals",
  shouldQuery: (analysis) => !analysis.broad && analysis.topics.has("goals"),
  query: (snapshot) => {
    const goals = snapshot.goals
      .map((goal) => {
        const progress = goalProgress(goal)
        return {
          name: goal.name,
          target: goal.target,
          current: goal.current,
          deadline: goal.deadline.slice(0, 10),
          ...progress,
          status: progress.completed ? "completed" : progress.atRisk ? "at-risk" : progress.nearDeadline ? "near-deadline" : "on-track",
        }
      })
      .sort((a, b) => Number(b.atRisk) - Number(a.atRisk) || a.deadline.localeCompare(b.deadline))

    return {
      reason: "A pergunta solicita valores, prazos ou progresso de metas.",
      data: {
        summary: goalSummary(snapshot.goals),
        goals: goals.slice(0, 50),
        resultCount: goals.length,
        truncated: goals.length > 50,
      },
    }
  },
}

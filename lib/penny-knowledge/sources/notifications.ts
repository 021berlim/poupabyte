import { isDateInRange } from "../query-utils"
import type { PennyKnowledgeSource } from "../types"

export const notificationsSource: PennyKnowledgeSource = {
  id: "notifications",
  title: "Notificações e alertas persistidos",
  description: "Alertas financeiros armazenados no navegador.",
  topics: ["notifications"],
  availableInformation: ["tipo", "título", "mensagem", "data", "estado de leitura"],
  examples: ["Tenho alertas pendentes?", "Quais notificações não li?", "Houve alerta de rentabilidade?"],
  sourceOfTruth: "poupabyte:data.notifications",
  shouldQuery: (analysis) => !analysis.broad && analysis.topics.has("notifications"),
  query: (snapshot, analysis) => {
    const unreadOnly = /\b(nao lida|nao lidas|pendente|pendentes)\b/.test(analysis.normalizedQuestion)
    const notifications = snapshot.notifications
      .filter((notification) => !unreadOnly || !notification.read)
      .filter((notification) => isDateInRange(notification.date, analysis.dateRange))
      .sort((a, b) => b.date.localeCompare(a.date))

    return {
      reason: "A pergunta consulta alertas ou notificações armazenadas.",
      data: {
        period: analysis.dateRange?.label ?? "todo o histórico disponível",
        unreadOnly,
        unreadCount: snapshot.notifications.filter((notification) => !notification.read).length,
        notifications: notifications.slice(0, 30).map((notification) => ({
          kind: notification.kind,
          severity: notification.type,
          title: notification.title,
          message: notification.message,
          date: notification.date,
          read: notification.read,
        })),
        resultCount: notifications.length,
        truncated: notifications.length > 30,
      },
    }
  },
}

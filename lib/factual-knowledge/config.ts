export type FactualKnowledgeEntry = {
  id: string
  title: string
  summary: string
  caution: string
  category: "rates" | "protection" | "tax" | "debt-education" | "future-capability"
  unstable: boolean
  lastReviewed: string
}

export type FactualKnowledgeConfig = {
  version: string
  lastUpdated: string
  disclaimer: string
  entries: FactualKnowledgeEntry[]
}

/** Fonte atualizável fora do prompt estático — revisar quando regras ou mercado mudarem. */
export const FACTUAL_KNOWLEDGE_CONFIG: FactualKnowledgeConfig = {
  version: "2026.06.1",
  lastUpdated: "2026-06-20",
  disclaimer:
    "Conteúdo educativo e sujeito a mudanças de legislação, reguladores ou mercado. Não substitui contador, advogado ou profissional habilitado.",
  entries: [
    {
      id: "selic",
      title: "Selic",
      category: "rates",
      unstable: true,
      lastReviewed: "2026-06-20",
      summary:
        "A Selic é a taxa básica de juros da economia brasileira e influencia o custo do crédito e parte da renda fixa.",
      caution:
        "Referência macroeconômica, não recomendação de produto. A taxa muda ao longo do tempo e não garante rendimento em nenhum investimento específico.",
    },
    {
      id: "cdi",
      title: "CDI",
      category: "rates",
      unstable: true,
      lastReviewed: "2026-06-20",
      summary:
        "O CDI é um índice de referência muito usado em renda fixa e costuma acompanhar de perto a Selic em períodos normais.",
      caution:
        "Serve para entender referências de renda fixa, não para escolher produto. Nem todo investimento acompanha o CDI da mesma forma.",
    },
    {
      id: "fgc",
      title: "FGC",
      category: "protection",
      unstable: true,
      lastReviewed: "2026-06-20",
      summary:
        "O Fundo Garantidor de Créditos protege determinados investimentos de renda fixa em instituições participantes, dentro de regras e limites vigentes.",
      caution:
        "Limites, coberturas e regras do FGC podem mudar. Confirme a regra vigente e a elegibilidade do investimento antes de decidir.",
    },
    {
      id: "tax-by-asset-class",
      title: "Tratamento fiscal por classe de ativo",
      category: "tax",
      unstable: true,
      lastReviewed: "2026-06-20",
      summary:
        "Classes como renda fixa, ações, fundos imobiliários, fundos e previdência podem ter regras fiscais diferentes, incluindo tributação, isenções e prazos.",
      caution:
        "Não forneço consultoria tributária personalizada nem alíquotas fixas aqui. Regras mudam com frequência — confirme a legislação vigente com um profissional.",
    },
    {
      id: "debt-strategies",
      title: "Estratégias de quitação de dívidas",
      category: "debt-education",
      unstable: false,
      lastReviewed: "2026-06-20",
      summary:
        "Avalanche prioriza juros mais altos; bola de neve prioriza a menor dívida para ganhar motivação. Ambas exigem dados completos da dívida para diagnóstico específico.",
      caution:
        "Sem saldo, taxa, parcelas e vencimentos cadastrados, explico o conceito, mas não digo qual dívida quitar primeiro.",
    },
    {
      id: "future-debts",
      title: "Cadastro de dívidas e cartão",
      category: "future-capability",
      unstable: false,
      lastReviewed: "2026-06-20",
      summary:
        "Para quitação personalizada, o app precisará capturar saldo, taxa de juros, parcelas, vencimentos, fatura e limite de cartão.",
      caution: "Funcionalidade futura — não invente diagnóstico com os dados atuais.",
    },
    {
      id: "future-insurance",
      title: "Seguros",
      category: "future-capability",
      unstable: false,
      lastReviewed: "2026-06-20",
      summary:
        "Cadastro futuro de seguros (vida, residencial, saúde) para tratar proteção patrimonial além de despesa.",
      caution: "Sem cadastro estruturado, não analise cobertura nem recomende apólice.",
    },
    {
      id: "future-retirement",
      title: "Previdência e aposentadoria",
      category: "future-capability",
      unstable: false,
      lastReviewed: "2026-06-20",
      summary:
        "Dados futuros de INSS, previdência privada, contribuição e prazo permitirão projeções educativas de longo prazo.",
      caution: "Projeções educativas nunca prometem valor final de aposentadoria.",
    },
    {
      id: "future-credit-score",
      title: "Score de crédito",
      category: "future-capability",
      unstable: false,
      lastReviewed: "2026-06-20",
      summary:
        "Só deve ser usado com fonte externa confiável ou dado informado manualmente pelo usuário.",
      caution: "Nunca invente nem estime score sem base.",
    },
  ],
}
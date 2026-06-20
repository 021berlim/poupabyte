import { ROUTES } from "../../routes"
import type { PennyKnowledgeSource } from "../types"

const APP_AREAS = [
  {
    route: ROUTES.dashboard,
    name: "Visão geral",
    capabilities: [
      "disponível para gastar no mês atual (renda do mês)",
      "salário fixo, renda extra e margem segura para decisões longas",
      "despesas, orçamento usado e economia prevista",
      "alertas de orçamentos e objetivos",
      "editar renda a qualquer momento",
    ],
  },
  {
    route: ROUTES.transactions,
    name: "Movimentações",
    capabilities: [
      "cadastrar, editar e excluir receitas e despesas",
      "buscar e filtrar por tipo, categoria e período",
      "importar PDF bancário com revisão antes de salvar",
      "ver origem (manual, PDF), pendências e duplicatas",
    ],
  },
  {
    route: ROUTES.cashflow,
    name: "Planejamento",
    capabilities: [
      "realizado vs previsto por mês",
      "projeção de fim do mês",
      "renda comprometida e despesas fixas pendentes",
      "recalcula automaticamente quando salário ou transações mudam",
    ],
  },
  {
    route: ROUTES.investments,
    name: "Patrimônio",
    capabilities: [
      "acompanhar reservas e investimentos",
      "registrar aportes, resgates e atualizações de valor",
      "consultar evolução patrimonial e relação com objetivos",
    ],
  },
  {
    route: ROUTES.goals,
    name: "Objetivos",
    capabilities: [
      "criar e acompanhar objetivos financeiros",
      "consultar viabilidade com base na renda atual",
      "ver valor por dia, prazo e risco de atraso",
    ],
  },
  {
    route: ROUTES.limits,
    name: "Orçamentos",
    capabilities: [
      "definir orçamento mensal por categoria ou subcategoria",
      "consultar planejado, gasto, restante e status",
      "sugestões de percentual com base no salário fixo",
    ],
  },
  {
    route: ROUTES.categories,
    name: "Categorias",
    capabilities: [
      "usar categorias padrão do sistema sem editar",
      "criar categorias e subcategorias personalizadas",
      "definir palavras-chave para categorização automática de PDF",
      "ocultar, duplicar ou personalizar categorias padrão",
    ],
  },
  {
    route: ROUTES.reports,
    name: "Análises",
    capabilities: [
      "interpretações sobre categorias, renda comprometida e projeção",
      "comparativos mensais e anuais",
      "objetivos em risco e patrimônio consolidado",
    ],
  },
  {
    route: ROUTES.assistant,
    name: "P.E.N.N.Y",
    capabilities: [
      "interpretar dados financeiros em modo leitura",
      "explicar impactos de mudança de salário e importação de PDF",
      "orientar sobre funcionalidades do PoupaByte",
    ],
  },
  {
    route: "global",
    name: "Notificações",
    capabilities: ["consultar alertas de planejamento", "marcar alertas como lidos ou removê-los"],
  },
]

export const appCapabilitiesSource: PennyKnowledgeSource = {
  id: "app-capabilities",
  title: "Funcionalidades do PoupaByte",
  description: "Catálogo estático das áreas e ações realmente disponíveis no aplicativo.",
  topics: ["app"],
  availableInformation: ["rotas", "nomes das áreas", "ações disponíveis", "limitações operacionais"],
  examples: ["Como importar um extrato?", "Onde vejo meus objetivos?", "O app compra investimentos?"],
  sourceOfTruth: "rotas e componentes da aplicação",
  shouldQuery: (analysis) => analysis.appHelp || (analysis.topics.has("app") && analysis.topics.size === 1),
  query: () => ({
    reason: "A pergunta solicita orientação sobre o funcionamento do aplicativo.",
    data: {
      areas: APP_AREAS,
      statementImport: {
        acceptedFormat: "PDF bancário de até 10 MB",
        nativeParsers: ["Banco Inter", "Bradesco"],
        conditionalParsers: ["Itaú", "Nubank", "outros bancos, quando o endpoint externo de interpretação estiver configurado"],
        workflow: [
          "selecionar arquivo PDF",
          "processar e extrair movimentações",
          "sugerir categorias e detectar duplicatas",
          "revisar itens",
          "confirmar importação",
          "recalcular visão geral, planejamento, orçamentos e análises",
        ],
        protectedPdf: "pode solicitar a senha do próprio arquivo",
        scannedPdf: "não suportado",
      },
      incomeEditing: {
        fields: ["salário mensal líquido", "dia de recebimento", "rendas extras previstas", "reserva mensal", "objetivo principal"],
        scopes: ["somente mês atual", "a partir do próximo mês", "recalcular meses anteriores"],
        impact: "dashboard, planejamento, orçamentos, objetivos, análises e alertas recalculam automaticamente",
      },
      operatingLimits: [
        "A P.E.N.N.Y consulta dados em modo leitura e não cria, edita ou exclui registros.",
        "O acompanhamento de patrimônio é informativo e não envia ordens de compra ou venda.",
        "Não existe sincronização bancária automática nem Open Finance.",
      ],
    },
  }),
}
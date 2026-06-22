"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import {
  queryPennyKnowledge,
  type PennyDataSnapshot,
} from "@/lib/penny-knowledge";
import type { PennyChatMessage } from "@/lib/penny";
import {
  buildAssistedWritePlan,
  formatAssistedWriteSuccess,
  isExplicitConfirmation,
  readPendingAssistedWritePlan,
  writePendingAssistedWritePlan,
  type AssistedWritePlan,
} from "@/lib/penny-assisted-write";
import { readPennyCreateTransactionsEnabled } from "@/lib/penny-preferences";
import { financialHealthScore } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api-url";
import { buildPennyStarterSuggestions, PENNY_STARTER_SUGGESTIONS } from "@/lib/ui-suggestions";
import { SendHorizontal, Sparkles, Square } from "lucide-react";
import { useRipple } from "@/hooks/use-ripple";

type ChatMessage = PennyChatMessage & { id: string };

const MENTIONED_ALERTS_KEY = "poupabyte:penny:mentioned-alerts";
const HEALTH_SCORE_KEY = "poupabyte:penny:last-health-score";

function readMentionedAlerts(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const value = JSON.parse(
      window.localStorage.getItem(MENTIONED_ALERTS_KEY) ?? "[]",
    );
    return new Set(
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

function readPreviousScore(): number | undefined {
  if (typeof window === "undefined") return undefined;
  const stored = window.localStorage.getItem(HEALTH_SCORE_KEY);
  if (stored === null) return undefined;
  const value = Number(stored);
  return Number.isFinite(value) ? value : undefined;
}

function SuggestionChips({
  suggestions,
  moreSuggestions,
  onSelect,
  disabled,
}: {
  suggestions: string[];
  moreSuggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled: boolean;
}) {
  const [showMore, setShowMore] = useState(false);
  const createRipple = useRipple<HTMLButtonElement>();
  const visible = showMore ? [...suggestions, ...moreSuggestions] : suggestions;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 py-7 text-center sm:py-9">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">Como posso ajudar?</p>
        <p className="text-sm text-muted-foreground">
          Escolha uma sugestão ou escreva sua pergunta.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {visible.map((suggestion) => (
          <Badge key={suggestion} variant="outline" asChild>
            <button
              type="button"
              disabled={disabled}
              className="app-ripple-surface min-h-9 max-w-full cursor-pointer whitespace-normal rounded-full px-3 py-1.5 text-left leading-5 hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
              onPointerDown={createRipple}
              onClick={() => onSelect(suggestion)}
            >
              {suggestion}
            </button>
          </Badge>
        ))}
      </div>
      {moreSuggestions.length > 0 ? (
        <button
          type="button"
          className="text-xs font-semibold text-primary hover:underline"
          onClick={() => setShowMore((open) => !open)}
        >
          {showMore ? "Ver menos sugestões" : "Ver mais sugestões"}
        </button>
      ) : null}
    </div>
  );
}

function ChatBubble({
  message,
  streaming,
}: {
  message: ChatMessage;
  streaming: boolean;
}) {
  const fromUser = message.role === "user";
  return (
    <article
      className={cn(
        "penny-message-enter flex w-full",
        fromUser ? "justify-end" : "justify-start",
      )}
      aria-label={`Mensagem de ${fromUser ? "você" : "Penny"}`}
    >
      <div
        className={cn(
          "flex max-w-[min(85%,44rem)] flex-col gap-1.5",
          fromUser ? "items-end" : "items-start",
        )}
      >
        <p className="px-1 text-[11px] font-semibold text-muted-foreground">
          {fromUser ? "Você" : "Penny"}
        </p>
        <div
          className={cn(
            "px-4 py-3 text-sm leading-6 shadow-sm",
            fromUser
              ? "rounded-2xl rounded-br-sm bg-primary text-primary-foreground"
              : "penny-response-surface rounded-2xl rounded-bl-sm bg-muted text-foreground",
          )}
        >
          {message.content ? (
            fromUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <FormattedAssistantContent content={message.content} />
            )
          ) : streaming ? (
            <ThinkingIndicator />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ThinkingIndicator() {
  return (
    <span
      className="penny-thinking"
      role="status"
      aria-label="Analisando contexto"
    >
      <span className="penny-thinking-label">Analisando</span>
      <span className="penny-thinking-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </span>
  );
}

function contentFromDelta(delta: unknown): string {
  if (typeof delta === "string") return delta;
  if (!Array.isArray(delta)) return "";
  return delta
    .map((part) => {
      if (typeof part === "string") return part;
      if (
        part &&
        typeof part === "object" &&
        "text" in part &&
        typeof part.text === "string"
      )
        return part.text;
      return "";
    })
    .join("");
}

function sanitizeAssistantText(value: string): string {
  return value
    .replace(/\*/g, "")
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "");
}

function FormattedAssistantContent({ content }: { content: string }) {
  return (
    <div className="penny-response-text space-y-2">
      {content.split("\n").map((rawLine, index) => {
        const line = rawLine.replace(/^#{1,6}\s+/, "").trimEnd();
        if (!line.trim())
          return <span key={index} className="block h-1" aria-hidden="true" />;

        const bullet = line.match(/^\s*[-•]\s+(.+)/);
        if (bullet) {
          return (
            <p key={index} className="penny-line-reveal flex gap-2">
              <span aria-hidden="true">•</span>
              <span>{bullet[1]}</span>
            </p>
          );
        }

        const numbered = line.match(/^\s*(\d+)[.)]\s+(.+)/);
        if (numbered) {
          return (
            <p key={index} className="penny-line-reveal flex gap-2">
              <span className="tabular-nums">{numbered[1]}.</span>
              <span>{numbered[2]}</span>
            </p>
          );
        }

        return (
          <p
            key={index}
            className={cn(
              "penny-line-reveal",
              line.endsWith(":") && "font-medium",
            )}
          >
            {line}
          </p>
        );
      })}
    </div>
  );
}

export default function AssistantPage() {
  const {
    user,
    financialProfile,
    lastImport,
    transactions,
    goals,
    limits,
    subscriptions,
    installments,
    creditCards,
    investments,
    notifications,
    userCategories,
    hiddenSystemCategories,
    categoryRules,
    applyAssistedWritePlan,
    applyAssistedCreatePlan,
    hydrated,
  } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [mentionedAlertKeys, setMentionedAlertKeys] =
    useState<Set<string>>(readMentionedAlerts);
  const [pendingWritePlan, setPendingWritePlan] =
    useState<AssistedWritePlan | null>(readPendingAssistedWritePlan);
  const [previousScore] = useState<number | undefined>(readPreviousScore);
  const [pennyCreateEnabled, setPennyCreateEnabled] = useState(
    readPennyCreateTransactionsEnabled,
  );
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const financialSnapshot = useMemo<PennyDataSnapshot>(
    () => ({
      financialProfile,
      lastImport,
      transactions,
      goals,
      limits,
      subscriptions,
      installments,
      creditCards,
      investments,
      notifications,
      userCategories,
      hiddenSystemCategories,
      categoryRules,
      previousHealthScore: previousScore,
      mentionedAlertKeys,
      pennyCreateTransactionsEnabled: pennyCreateEnabled,
    }),
    [
      financialProfile,
      lastImport,
      goals,
      investments,
      limits,
      subscriptions,
      installments,
      creditCards,
      mentionedAlertKeys,
      notifications,
      previousScore,
      transactions,
      userCategories,
      hiddenSystemCategories,
      categoryRules,
      pennyCreateEnabled,
    ],
  );

  useEffect(() => {
    const syncPreference = () => setPennyCreateEnabled(readPennyCreateTransactionsEnabled());
    window.addEventListener("storage", syncPreference);
    window.addEventListener("focus", syncPreference);
    return () => {
      window.removeEventListener("storage", syncPreference);
      window.removeEventListener("focus", syncPreference);
    };
  }, []);
  const currentHealthScore = useMemo(
    () => financialHealthScore(transactions, goals, limits, investments).score,
    [goals, investments, limits, transactions],
  );
  const pennySuggestions = useMemo(
    () =>
      buildPennyStarterSuggestions(
        transactions,
        financialProfile,
        goals,
        limits,
        subscriptions,
        installments,
      ),
    [transactions, financialProfile, goals, limits, subscriptions, installments],
  );
  const pennyMoreSuggestions = useMemo(
    () => PENNY_STARTER_SUGGESTIONS.filter((item) => !pennySuggestions.includes(item)),
    [pennySuggestions],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      endOfMessagesRef.current?.scrollIntoView({
        behavior: isStreaming ? "auto" : "smooth",
        block: "nearest",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isStreaming, messages]);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const sendMessage = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isStreaming) return;

      const activePendingPlan = pendingWritePlan ?? readPendingAssistedWritePlan();

      if (isExplicitConfirmation(content) && activePendingPlan) {
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          role: "user",
          content,
        };
        const updatedCount =
          activePendingPlan.action === "create"
            ? applyAssistedCreatePlan(activePendingPlan)
            : applyAssistedWritePlan(activePendingPlan);
        writePendingAssistedWritePlan(null);
        setPendingWritePlan(null);
        setMessages((current) => [
          ...current,
          userMessage,
          {
            id: `assistant-${Date.now() + 1}`,
            role: "assistant",
            content: formatAssistedWriteSuccess(activePendingPlan, updatedCount),
          },
        ]);
        setInput("");
        setError("");
        return;
      }

      const immediatePlan = buildAssistedWritePlan(
        transactions,
        content,
        userCategories,
        { createEnabled: pennyCreateEnabled },
      );
      if (immediatePlan && isExplicitConfirmation(content)) {
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          role: "user",
          content,
        };
        const updatedCount =
          immediatePlan.action === "create"
            ? applyAssistedCreatePlan(immediatePlan)
            : applyAssistedWritePlan(immediatePlan);
        setMessages((current) => [
          ...current,
          userMessage,
          {
            id: `assistant-${Date.now() + 1}`,
            role: "assistant",
            content: formatAssistedWriteSuccess(immediatePlan, updatedCount),
          },
        ]);
        setInput("");
        setError("");
        return;
      }

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };
      const assistantId = `assistant-${Date.now() + 1}`;
      const conversation = [...messages, userMessage].slice(-28);
      const knowledgeContext = queryPennyKnowledge(financialSnapshot, {
        question: content,
        previousUserQuestions: messages
          .filter((message) => message.role === "user")
          .map((message) => message.content),
      });
      const pendingAlertKeys = knowledgeContext.routing.alertKeys;
      const assistedPlan = (
        knowledgeContext.data["assisted-write"] as { plan?: AssistedWritePlan | null } | undefined
      )?.plan;
      if (
        assistedPlan?.transactionIds?.length ||
        (assistedPlan?.action === "create" && assistedPlan?.proposedTransaction)
      ) {
        writePendingAssistedWritePlan(assistedPlan);
        setPendingWritePlan(assistedPlan);
      }
      setMessages([
        ...conversation,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setInput("");
      setError("");
      setIsStreaming(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      let receivedContent = false;
      const analysisStartedAt = window.performance.now();

      try {
        const response = await fetch(apiUrl("/api/assistant"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: conversation.map(({ role, content: messageContent }) => ({
              role,
              content: messageContent,
            })),
            context: knowledgeContext,
            ...(user?.name ? { userName: user.name } : {}),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(
            payload?.error ||
              "Não foi possível obter resposta da Penny",
          );
        }
        if (!response.body)
          throw new Error("O servidor não iniciou o fluxo de resposta.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          buffer += decoder
            .decode(value, { stream: !done })
            .replace(/\r\n/g, "\n");

          let boundary = buffer.indexOf("\n\n");
          while (boundary >= 0) {
            const event = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const data = event
              .split("\n")
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trimStart())
              .join("\n");

            if (data && data !== "[DONE]") {
              const payload = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: unknown } }>;
                error?: { message?: string };
              };
              if (payload.error)
                throw new Error(
                  payload.error.message || "O provedor interrompeu a resposta.",
                );
              const chunk = sanitizeAssistantText(
                contentFromDelta(payload.choices?.[0]?.delta?.content),
              );
              if (chunk) {
                if (!receivedContent) {
                  const remainingAnalysisTime =
                    1_600 - (window.performance.now() - analysisStartedAt);
                  if (remainingAnalysisTime > 0) {
                    await new Promise((resolve) =>
                      window.setTimeout(resolve, remainingAnalysisTime),
                    );
                  }
                }
                receivedContent = true;
                for (let offset = 0; offset < chunk.length; ) {
                  if (controller.signal.aborted)
                    throw new DOMException(
                      "Resposta interrompida",
                      "AbortError",
                    );
                  const currentCharacter = chunk[offset];
                  const deliberatePause = /[.!?\n]/.test(currentCharacter);
                  const step = deliberatePause ? 1 : 2;
                  const typedPart = chunk.slice(offset, offset + step);
                  offset += typedPart.length;
                  setMessages((current) =>
                    current.map((message) =>
                      message.id === assistantId
                        ? { ...message, content: message.content + typedPart }
                        : message,
                    ),
                  );
                  const pause = /[.!?]\s?$/.test(typedPart)
                    ? 72
                    : /[,;:]\s?$/.test(typedPart)
                      ? 42
                      : typedPart.includes("\n")
                        ? 52
                        : 18;
                  await new Promise((resolve) =>
                    window.setTimeout(resolve, pause),
                  );
                }
              }
            }
            boundary = buffer.indexOf("\n\n");
          }

          if (done) break;
        }

        if (!receivedContent)
          throw new Error("O provedor encerrou a resposta sem conteúdo.");
        try {
          window.localStorage.setItem(
            HEALTH_SCORE_KEY,
            String(currentHealthScore),
          );
        } catch {}
        if (pendingAlertKeys.length) {
          setMentionedAlertKeys((current) => {
            const next = new Set([...current, ...pendingAlertKeys]);
            try {
              window.localStorage.setItem(
                MENTIONED_ALERTS_KEY,
                JSON.stringify([...next].slice(-200)),
              );
            } catch {}
            return next;
          });
        }
      } catch (caught) {
        if (controller.signal.aborted) {
          setMessages((current) =>
            current.filter(
              (message) => message.id !== assistantId || message.content,
            ),
          );
        } else {
          setMessages((current) =>
            current.filter((message) => message.id !== assistantId),
          );
          setError(
            caught instanceof Error
              ? caught.message
              : "Erro ao consultar a Penny",
          );
        }
      } finally {
        if (abortControllerRef.current === controller)
          abortControllerRef.current = null;
        setIsStreaming(false);
      }
    },
    [
      applyAssistedWritePlan,
      applyAssistedCreatePlan,
      currentHealthScore,
      financialSnapshot,
      isStreaming,
      messages,
      pendingWritePlan,
      pennyCreateEnabled,
      transactions,
      user?.name,
      userCategories,
    ],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function stopStreaming() {
    abortControllerRef.current?.abort();
  }

  return (
    <div
      data-assistant-page
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <PageHeader
        title="Penny"
        subtitle="Pergunte sobre suas finanças."
      />

      <div className="flex min-h-0 flex-1 flex-col pt-4 md:pt-0">
        <div className="shrink-0 pb-4 md:hidden">
          <Separator />
        </div>

        <ScrollArea className="min-h-0 flex-1 overflow-hidden pr-3">
          <div
            className="flex min-h-full flex-col gap-5 pb-5"
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <ChatBubble
                key={message.id}
                message={message}
                streaming={
                  isStreaming &&
                  index === messages.length - 1 &&
                  message.role === "assistant"
                }
              />
            ))}
            {hydrated && messages.length <= 1 ? (
              <SuggestionChips
                suggestions={pennySuggestions}
                moreSuggestions={pennyMoreSuggestions}
                onSelect={(value) => void sendMessage(value)}
                disabled={isStreaming}
              />
            ) : null}
            <div ref={endOfMessagesRef} />
          </div>
        </ScrollArea>

        <footer className="shrink-0">
          <Separator />
          <div className="mx-auto w-full max-w-3xl pt-3">
            {error ? (
              <p
                role="alert"
                className="mb-2 text-center text-xs text-destructive"
              >
                {error}
              </p>
            ) : null}
            <form className="flex items-center gap-2" onSubmit={handleSubmit}>
              <Input
                aria-label="Mensagem para Penny"
                autoComplete="off"
                placeholder="Pergunte o que quiser..."
                value={input}
                disabled={!hydrated || isStreaming}
                onChange={(event) => setInput(event.target.value)}
                className="h-11 flex-1 rounded-xl"
              />
              {isStreaming ? (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-11 w-11 shrink-0 rounded-xl"
                  onClick={stopStreaming}
                  aria-label="Interromper resposta"
                >
                  <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl"
                  disabled={!hydrated || !input.trim()}
                  aria-label="Enviar mensagem"
                >
                  <SendHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </form>
            <p className="pt-2 text-center text-[11px] leading-4 text-muted-foreground">
              Penny usa seus dados e pode organizar lançamentos — ou criar
              novos, se você autorizar em Minha conta. Sempre pede confirmação.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

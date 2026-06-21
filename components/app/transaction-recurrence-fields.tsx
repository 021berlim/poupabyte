"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  RECURRENCE_DURATION_LABELS,
  RECURRENCE_FREQUENCY_LABELS,
  RECURRENCE_KIND_LABELS,
  type RecurrenceFormState,
} from "@/lib/transaction-recurrence"

type Props = {
  value: RecurrenceFormState
  onChange: (next: RecurrenceFormState) => void
  disabled?: boolean
}

export function TransactionRecurrenceFields({ value, onChange, disabled = false }: Props) {
  function patch(partial: Partial<RecurrenceFormState>) {
    onChange({ ...value, ...partial })
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-muted/30 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Recorrência</p>
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
            Declare se a despesa se repete, por quanto tempo e se é uma assinatura.
          </p>
        </div>
        <Switch
          aria-label="Despesa recorrente"
          checked={value.enabled}
          disabled={disabled}
          onCheckedChange={(checked) => patch({ enabled: checked === true })}
        />
      </div>

      {value.enabled ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={value.kind}
              disabled={disabled}
              onValueChange={(kind) =>
                patch({
                  kind: kind as RecurrenceFormState["kind"],
                  frequency: kind === "fixed" ? "monthly" : value.frequency,
                  durationKind: kind === "fixed" ? "indefinite" : value.durationKind,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RECURRENCE_KIND_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Frequência</Label>
              <Select
                value={value.frequency}
                disabled={disabled || value.kind === "fixed"}
                onValueChange={(frequency) =>
                  patch({ frequency: frequency as RecurrenceFormState["frequency"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRENCE_FREQUENCY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {value.frequency !== "weekly" ? (
              <div className="space-y-1.5">
                <Label htmlFor="recurrence-billing-day">Dia da cobrança</Label>
                <Input
                  id="recurrence-billing-day"
                  type="number"
                  min={1}
                  max={31}
                  disabled={disabled}
                  value={value.billingDay}
                  onChange={(event) => patch({ billingDay: event.target.value })}
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Duração</Label>
            <Select
              value={value.durationKind}
              disabled={disabled || value.kind === "fixed"}
              onValueChange={(durationKind) =>
                patch({ durationKind: durationKind as RecurrenceFormState["durationKind"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RECURRENCE_DURATION_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {value.durationKind === "until" ? (
            <div className="space-y-1.5">
              <Label htmlFor="recurrence-end-date">Até</Label>
              <Input
                id="recurrence-end-date"
                type="date"
                disabled={disabled}
                value={value.endDate}
                onChange={(event) => patch({ endDate: event.target.value })}
              />
            </div>
          ) : null}

          {value.durationKind === "count" ? (
            <div className="space-y-1.5">
              <Label htmlFor="recurrence-count">Quantidade de cobranças</Label>
              <Input
                id="recurrence-count"
                type="number"
                min={2}
                disabled={disabled}
                value={value.occurrenceCount}
                onChange={(event) => patch({ occurrenceCount: event.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Inclui esta cobrança e as repetições seguintes.
              </p>
            </div>
          ) : null}

          {value.kind === "subscription" ? (
            <p className="text-xs leading-4 text-muted-foreground">
              Assinaturas ativas entram no planejamento mensal em Minha conta.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
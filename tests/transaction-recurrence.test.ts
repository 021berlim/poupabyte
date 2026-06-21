import { describe, expect, it } from "vitest"
import {
  applyRecurrenceFlags,
  buildRecurrenceFromForm,
  formatRecurrenceSummary,
  inferRecurrenceFromLegacy,
  isRecurrenceActive,
  planSubscriptionSync,
  validateRecurrenceForm,
} from "../lib/transaction-recurrence"
import type { Subscription, Transaction } from "../lib/types"

const baseTransaction: Transaction = {
  id: "tx-1",
  type: "expense",
  description: "Netflix",
  amount: 39.9,
  category: "assinaturas",
  date: "2026-06-08T12:00:00.000Z",
}

describe("transaction recurrence", () => {
  it("infers legacy subscription flags", () => {
    const recurrence = inferRecurrenceFromLegacy({
      ...baseTransaction,
      isSubscription: true,
      isRecurring: true,
    })
    expect(recurrence?.kind).toBe("subscription")
    expect(recurrence?.frequency).toBe("monthly")
  })

  it("builds recurrence payload from form", () => {
    const recurrence = buildRecurrenceFromForm({
      enabled: true,
      kind: "custom",
      frequency: "weekly",
      durationKind: "count",
      billingDay: "8",
      endDate: "",
      occurrenceCount: "6",
    })
    expect(recurrence).toEqual({
      kind: "custom",
      frequency: "weekly",
      durationKind: "count",
      billingDay: 8,
      occurrenceCount: 6,
    })
  })

  it("validates limited recurrence", () => {
    expect(
      validateRecurrenceForm(
        {
          enabled: true,
          kind: "custom",
          frequency: "monthly",
          durationKind: "count",
          billingDay: "10",
          endDate: "",
          occurrenceCount: "1",
        },
        baseTransaction.date,
      ),
    ).toContain("Informe pelo menos 2 cobranças para uma recorrência limitada.")
  })

  it("applies recurrence flags to transaction", () => {
    const next = applyRecurrenceFlags({
      ...baseTransaction,
      recurrence: {
        kind: "subscription",
        frequency: "monthly",
        durationKind: "indefinite",
        billingDay: 8,
      },
    })
    expect(next.isSubscription).toBe(true)
    expect(next.isRecurring).toBe(true)
    expect(next.isFixed).toBeUndefined()
  })

  it("formats recurrence summary", () => {
    const summary = formatRecurrenceSummary({
      recurrence: {
        kind: "fixed",
        frequency: "monthly",
        durationKind: "indefinite",
        billingDay: 3,
      },
    })
    expect(summary).toContain("Conta fixa")
    expect(summary).toContain("dia 3")
  })

  it("detects inactive recurrence after end date", () => {
    const active = isRecurrenceActive({
      date: "2026-01-10T12:00:00.000Z",
      recurrence: {
        kind: "custom",
        frequency: "monthly",
        durationKind: "until",
        billingDay: 10,
        endDate: "2026-06-10T12:00:00.000Z",
      },
    }, new Date("2026-06-21T12:00:00.000Z"))
    expect(active).toBe(false)
  })

  it("plans subscription sync for recurring subscriptions", () => {
    const subscriptions: Subscription[] = []
    const plan = planSubscriptionSync(
      {
        ...baseTransaction,
        recurrence: {
          kind: "subscription",
          frequency: "monthly",
          durationKind: "indefinite",
          billingDay: 8,
        },
      },
      subscriptions,
    )
    expect(plan.add?.name).toBe("Netflix")
    expect(plan.add?.amount).toBe(39.9)
  })
})
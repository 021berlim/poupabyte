"use client"

import type { ChangeEvent, ComponentProps } from "react"

import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

export function formatCurrencyInput(value: number | string | undefined): string {
 if (value === undefined || value === "") return ""
 const numeric = typeof value === "number" ? value : Number(value)
 if (!Number.isFinite(numeric)) return ""
 return new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
 }).format(numeric)
}

function formatTypedAmount(value: string): string {
 const digits = value.replace(/\D/g, "")
 if (!digits) return ""
 return new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
 }).format(Number(digits) / 100)
}

type CurrencyInputProps = Omit<ComponentProps<"input">, "onChange"> & {
 onChange: (value: string) => void
}

export function CurrencyInput({ className, onChange, value, ...props }: CurrencyInputProps) {
 function handleChange(event: ChangeEvent<HTMLInputElement>) {
  onChange(formatTypedAmount(event.target.value))
 }

 return (
  <InputGroup className={cn("h-10", className)}>
   <InputGroupAddon>
    <InputGroupText>R$</InputGroupText>
   </InputGroupAddon>
   <InputGroupInput
    inputMode="numeric"
    value={value}
    onChange={handleChange}
    placeholder="0,00"
    {...props}
   />
  </InputGroup>
 )
}

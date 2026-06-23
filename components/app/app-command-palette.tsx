"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { NAV_ITEMS } from "@/lib/nav"
import { ROUTES } from "@/lib/routes"

export function AppCommandPalette({
  onNewTransaction,
}: {
  onNewTransaction?: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((value) => !value)
        return
      }
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key.toLowerCase() === "n") {
        event.preventDefault()
        onNewTransaction?.()
      }
      if (event.key === "/") {
        event.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onNewTransaction])

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Atalhos rápidos" description="Navegue ou execute ações.">
      <CommandInput placeholder="Buscar tela ou ação..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => {
                setOpen(false)
                router.push(item.href)
              }}
            >
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Ações">
          <CommandItem
            onSelect={() => {
              setOpen(false)
              if (onNewTransaction) {
                onNewTransaction()
              } else {
                router.push(`${ROUTES.transactions}?new=1`)
              }
            }}
          >
            Novo lançamento
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false)
              router.push(ROUTES.transactions)
            }}
          >
            Buscar lançamentos
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
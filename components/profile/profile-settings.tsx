"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
 Bell,
 ChevronLeft,
 ChevronRight,
 Download,
 FileText,
 LockKeyhole,
 Moon,
 ShieldCheck,
 Smartphone,
 Sparkles,
} from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { TRANSACTION_TYPES } from "@/lib/copy"
import { formatCurrency } from "@/lib/format"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import {
 readPennyCreateTransactionsEnabled,
 writePennyCreateTransactionsEnabled,
} from "@/lib/penny-preferences"
import { toast } from "sonner"

const NOTIFICATIONS_KEY = "poupabyte:notifications-enabled"

function escapeCsv(value: string | number) {
 const text = String(value)
 return /[";,\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function escapeHtml(value: string | number) {
 return String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
}

export function StatusDot({
 label,
 tone = "neutral",
}: {
 label: string
 tone?: "neutral" | "positive"
}) {
 return (
  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
   <span
    aria-hidden="true"
    className={cn(
     "h-1.5 w-1.5 rounded-full",
     tone === "positive" ? "bg-emerald-400" : "bg-muted-foreground",
    )}
   />
   {label}
  </span>
 )
}

export function SectionLabel({
 id,
 icon: Icon,
 children,
}: {
 id: string
 icon: LucideIcon
 children: ReactNode
}) {
 return (
  <div className="mb-3 flex items-center gap-1.5">
   <Icon aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
   <h2 id={id} className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
    {children}
   </h2>
  </div>
 )
}

function SettingCopy({ title, description }: { title: string; description: string }) {
 return (
  <div className="min-w-0">
   <p className="text-sm font-medium text-foreground">{title}</p>
   <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{description}</p>
  </div>
 )
}

export function SecuritySettings() {
 const { changePassword } = useStore()
 const [passwordOpen, setPasswordOpen] = useState(false)
 const [currentPassword, setCurrentPassword] = useState("")
 const [newPassword, setNewPassword] = useState("")
 const [confirmPassword, setConfirmPassword] = useState("")
 const [passwordError, setPasswordError] = useState("")

 function handlePasswordOpen(open: boolean) {
  setPasswordOpen(open)
  if (open) {
   setCurrentPassword("")
   setNewPassword("")
   setConfirmPassword("")
   setPasswordError("")
  }
 }

 function savePassword(event: FormEvent) {
  event.preventDefault()
  if (newPassword.length < 6) {
   setPasswordError("A nova senha deve ter ao menos 6 caracteres.")
   return
  }
  if (newPassword !== confirmPassword) {
   setPasswordError("A confirmação não corresponde à nova senha.")
   return
  }
  const result = changePassword(currentPassword, newPassword)
  if (!result.ok) {
   setPasswordError(result.error ?? "Não foi possível alterar a senha.")
   return
  }
  setPasswordOpen(false)
  toast.success("Senha alterada com sucesso.")
 }

 return (
  <>
   <div className="flex flex-col">
    <button
     type="button"
     onClick={() => handlePasswordOpen(true)}
     className="app-row-hover -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 text-left"
    >
     <LockKeyhole aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
     <SettingCopy title="Alterar senha" description="Troque sua senha de acesso" />
     <ChevronRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
    <Separator />
    <div className="flex items-start gap-3 py-3">
     <Smartphone aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
     <SettingCopy title="Chrome · Windows" description="Dispositivo usado neste acesso" />
     <div className="ml-auto shrink-0 pt-0.5">
      <StatusDot label="Sessão atual" tone="positive" />
     </div>
    </div>
   </div>
   <p className="mt-3 text-xs leading-5 text-muted-foreground">
    A navegação autenticada usa estado local para simular login, cadastro e recuperação de senha.
   </p>

   <Dialog open={passwordOpen} onOpenChange={handlePasswordOpen}>
    <DialogContent>
     <DialogHeader>
      <DialogTitle>Alterar senha</DialogTitle>
      <DialogDescription>Crie uma nova senha para acessar sua conta.</DialogDescription>
     </DialogHeader>
     <form onSubmit={savePassword}>
      <div className="space-y-4 px-6 py-5">
       <div className="space-y-1.5">
        <Label htmlFor="current-password">Senha atual</Label>
        <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setPasswordError("") }} required />
       </div>
       <div className="space-y-1.5">
        <Label htmlFor="new-password">Nova senha</Label>
        <Input id="new-password" type="password" autoComplete="new-password" aria-invalid={passwordError ? true : undefined} value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setPasswordError("") }} required />
        <p className="text-xs text-muted-foreground">Use pelo menos 6 caracteres.</p>
       </div>
       <div className="space-y-1.5">
        <Label htmlFor="confirm-password">Confirmar nova senha</Label>
        <Input id="confirm-password" type="password" autoComplete="new-password" aria-invalid={passwordError ? true : undefined} value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setPasswordError("") }} required />
       </div>
       {passwordError && <p role="alert" className="text-xs text-destructive">{passwordError}</p>}
      </div>
      <DialogFooter>
       <Button type="button" variant="outline" onClick={() => setPasswordOpen(false)}>Cancelar</Button>
       <Button type="submit">Salvar nova senha</Button>
      </DialogFooter>
     </form>
    </DialogContent>
   </Dialog>
  </>
 )
}

export function PreferencesSettings() {
 const { resolvedTheme, setTheme } = useTheme()
 const [notificationsEnabled, setNotificationsEnabled] = useState(true)
 const [pennyCreateEnabled, setPennyCreateEnabled] = useState(false)

 useEffect(() => {
  const frame = window.requestAnimationFrame(() => {
   try {
    const stored = window.localStorage.getItem(NOTIFICATIONS_KEY)
    if (stored !== null) setNotificationsEnabled(stored === "true")
   } catch {}
   setPennyCreateEnabled(readPennyCreateTransactionsEnabled())
  })
  return () => window.cancelAnimationFrame(frame)
 }, [])

 function handleNotificationsChange(checked: boolean) {
  setNotificationsEnabled(checked)
  try {
   window.localStorage.setItem(NOTIFICATIONS_KEY, String(checked))
  } catch {}
 }

 function handlePennyCreateChange(checked: boolean) {
  setPennyCreateEnabled(checked)
  writePennyCreateTransactionsEnabled(checked)
 }

 return (
  <div className="flex flex-col">
   <div className="flex items-start justify-between gap-4 py-3">
    <div className="flex min-w-0 items-start gap-3">
     <Moon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
     <SettingCopy title="Tema escuro" description="Ative para telas com pouca luz" />
    </div>
    <Switch aria-label="Tema escuro" className="shrink-0" checked={resolvedTheme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
   </div>
   <Separator />
   <div className="flex items-start justify-between gap-4 py-3">
    <div className="flex min-w-0 items-start gap-3">
     <Bell aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
     <SettingCopy title="Alertas de limite e metas" description="Aviso quando passar do limite ou da meta" />
    </div>
    <Switch aria-label="Alertas de limite e metas" className="shrink-0" checked={notificationsEnabled} onCheckedChange={handleNotificationsChange} />
   </div>
   <Separator />
   <div className="flex items-start justify-between gap-4 py-3">
    <div className="flex min-w-0 items-start gap-3">
     <Sparkles aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
     <SettingCopy
      title="Penny pode criar lançamentos"
      description="Cada lançamento precisa da sua confirmação"
     />
    </div>
    <Switch
     aria-label="Penny pode criar lançamentos"
     className="shrink-0"
     checked={pennyCreateEnabled}
     onCheckedChange={handlePennyCreateChange}
    />
   </div>
  </div>
 )
}

export function PrivacySettings() {
 const { transactions, user } = useStore()
 const [exportOpen, setExportOpen] = useState(false)
 const [exportFormat, setExportFormat] = useState("csv")

 function exportCsv() {
  const rows = [
   ["Data", "Tipo", "Descrição", "Categoria", "Valor"],
   ...transactions.map((transaction) => [
    new Date(transaction.date).toLocaleDateString("pt-BR"),
    transaction.type === "income" ? TRANSACTION_TYPES.income : TRANSACTION_TYPES.expense,
    transaction.description,
    transaction.category,
    transaction.amount.toFixed(2).replace(".", ","),
   ]),
  ]
  const csv = rows.map((row) => row.map(escapeCsv).join(";")).join("\n")
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `poupabyte-extrato-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
 }

 function exportPdf() {
  const printWindow = window.open("", "_blank")
  if (!printWindow) {
   toast.error("Permita pop-ups para exportar o PDF.")
   return false
  }
  printWindow.opener = null
  const rows = transactions.map((transaction) => `
   <tr>
    <td>${escapeHtml(new Date(transaction.date).toLocaleDateString("pt-BR"))}</td>
    <td>${transaction.type === "income" ? TRANSACTION_TYPES.income : TRANSACTION_TYPES.expense}</td>
    <td>${escapeHtml(transaction.description)}</td>
    <td>${escapeHtml(formatCurrency(transaction.amount))}</td>
   </tr>`).join("")
  printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><title>Extrato PoupaByte</title><style>
   body{font-family:Arial,sans-serif;color:#14161a;padding:32px}h1{font-size:22px;margin:0 0 6px}p{color:#697386;font-size:12px;margin:0 0 24px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;border-bottom:1px solid #e4e8ef;padding:9px 6px}th{font-size:10px;text-transform:uppercase;color:#697386}@media print{body{padding:0}}
  </style></head><body><h1>Extrato PoupaByte</h1><p>${escapeHtml(user?.name ?? "Conta")} · gerado em ${escapeHtml(new Date().toLocaleDateString("pt-BR"))}</p><table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`)
  printWindow.document.close()
  return true
 }

 function handleExport(event: FormEvent) {
  event.preventDefault()
  const exported = exportFormat === "csv" ? (exportCsv(), true) : exportPdf()
  if (!exported) return
  setExportOpen(false)
  toast.success(exportFormat === "csv" ? "Extrato CSV exportado." : "Extrato pronto para salvar em PDF.")
 }

 return (
  <>
   <div className="flex flex-col">
    <button type="button" onClick={() => setExportOpen(true)} className="app-row-hover -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 text-left">
     <Download aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
     <SettingCopy title="Exportar dados" description="Baixe lançamentos em CSV ou PDF" />
     <ChevronRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
    <Separator />
    <Link href="/terms" className="app-row-hover -mx-2 flex items-center gap-3 rounded-lg px-2 py-3">
     <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
     <SettingCopy title="Termos de uso" description="Regras de uso do PoupaByte" />
     <ChevronRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
    <Separator />
    <Link href="/privacy" className="app-row-hover -mx-2 flex items-center gap-3 rounded-lg px-2 py-3">
     <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
     <SettingCopy title="Política de privacidade" description="Como tratamos seus dados" />
     <ChevronRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
   </div>

   <Dialog open={exportOpen} onOpenChange={setExportOpen}>
    <DialogContent>
     <DialogHeader>
      <DialogTitle>Exportar dados</DialogTitle>
      <DialogDescription>Escolha o formato do extrato a exportar.</DialogDescription>
     </DialogHeader>
     <form onSubmit={handleExport}>
      <div className="px-6 py-5">
       <RadioGroup value={exportFormat} onValueChange={setExportFormat} className="grid grid-cols-2 gap-3">
        {[{ value: "csv", label: "CSV" }, { value: "pdf", label: "PDF" }].map((option) => (
         <Label key={option.value} htmlFor={`export-${option.value}`} className="flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
          <RadioGroupItem id={`export-${option.value}`} value={option.value} />{option.label}
         </Label>
        ))}
       </RadioGroup>
      </div>
      <DialogFooter>
       <Button type="button" variant="outline" onClick={() => setExportOpen(false)}>Cancelar</Button>
       <Button type="submit"><Download className="h-4 w-4" />Exportar</Button>
      </DialogFooter>
     </form>
    </DialogContent>
   </Dialog>
  </>
 )
}

export function ProfileSubpage({ title, children }: { title: string; children: ReactNode }) {
 const router = useRouter()

 return (
  <div className="md:hidden">
   <div className="hidden"><PageHeader title="Perfil" /></div>
   <header className="flex items-center gap-3 pb-4 pt-1">
    <button
     type="button"
     onClick={() => router.back()}
     className="-ml-1 rounded-lg p-1 text-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
     aria-label="Voltar ao perfil"
    >
     <ChevronLeft aria-hidden="true" className="h-5 w-5" />
    </button>
    <h1 className="text-lg font-semibold">{title}</h1>
   </header>
   <Separator />
   <div className="pt-3">{children}</div>
  </div>
 )
}

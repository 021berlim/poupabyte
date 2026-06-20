"use client"

import { Fragment, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
 BarChart3,
 Camera,
 ChevronRight,
 Lock,
 LogOut,
 Pencil,
 RefreshCcw,
 ShieldCheck,
 SlidersHorizontal,
 UserRound,
} from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { ROUTES } from "@/lib/routes"
import { StatStrip } from "@/components/app/stat-strip"
import {
 PreferencesSettings,
 PrivacySettings,
 SectionLabel,
 SecuritySettings,
 StatusDot,
} from "@/components/profile/profile-settings"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/format"
import { monthExpense, monthIncome, monthlyComparison, totalBalance } from "@/lib/selectors"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const DEFAULT_AVATAR_SRC = "/images/onboarding-hero.jpg"

function initials(name?: string) {
 if (!name) return "PB"
 return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()
}

function changeLabel(value: number) {
 const sign = value >= 0 ? "+" : "−"
 return `${sign}${Math.abs(value).toFixed(1).replace(".", ",")}% vs anterior`
}

function formatMonthYear(value?: string) {
 const date = value ? new Date(value) : new Date("2026-02-01T12:00:00.000Z")
 const month = date.toLocaleDateString("pt-BR", { month: "short" })
 return `${month} ${date.getFullYear()}`
}

function ProfileMenuRow({
 icon: Icon,
 title,
 subtitle,
 href,
}: {
 icon: LucideIcon
 title: string
 subtitle: string
 href: string
}) {
 return (
  <Link
   href={href}
   className="app-row-hover -mx-2 flex items-center gap-3 rounded-lg px-2 py-3.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
  >
   <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/40">
    <Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
   </div>
   <div className="min-w-0 flex-1">
    <p className="text-sm font-medium text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground">{subtitle}</p>
   </div>
   <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
  </Link>
 )
}

export default function ProfilePage() {
 const router = useRouter()
 const {
  user,
  transactions,
  logout,
  resetDemoData,
  updateProfile,
 } = useStore()
 const fileInputRef = useRef<HTMLInputElement>(null)
 const [resetOpen, setResetOpen] = useState(false)
 const [photoOpen, setPhotoOpen] = useState(false)
 const [editOpen, setEditOpen] = useState(false)
 const [photoPreview, setPhotoPreview] = useState("")
 const [profileName, setProfileName] = useState("")
 const [profileEmail, setProfileEmail] = useState("")
 const avatarSrc = user?.avatar ?? DEFAULT_AVATAR_SRC
 const stats = useMemo(() => ({
  balance: totalBalance(transactions),
  income: monthIncome(transactions),
  expense: monthExpense(transactions),
  comparison: monthlyComparison(transactions),
 }), [transactions])

 function handleLogout() {
  logout()
  toast.success("Sessão encerrada.")
  router.replace("/login")
 }

 function handlePhotoOpen(open: boolean) {
  setPhotoOpen(open)
  if (open) setPhotoPreview(avatarSrc)
  if (!open && fileInputRef.current) fileInputRef.current.value = ""
 }

 function handleAvatarFile(event: ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith("image/")) {
   toast.error("Escolha um arquivo de imagem.")
   event.target.value = ""
   return
  }
  if (file.size > 2 * 1024 * 1024) {
   toast.error("A imagem deve ter no máximo 2 MB.")
   event.target.value = ""
   return
  }

  const reader = new FileReader()
  reader.onload = () => setPhotoPreview(String(reader.result))
  reader.onerror = () => toast.error("Não foi possível ler a imagem.")
  reader.readAsDataURL(file)
 }

 function savePhoto() {
  if (!user || !photoPreview) return
  const result = updateProfile({ name: user.name, email: user.email, avatar: photoPreview })
  if (!result.ok) {
   toast.error(result.error ?? "Não foi possível salvar a foto.")
   return
  }
  setPhotoOpen(false)
  toast.success("Foto de perfil atualizada.")
 }

 function handleEditOpen(open: boolean) {
  setEditOpen(open)
  if (open) {
   setProfileName(user?.name ?? "")
   setProfileEmail(user?.email ?? "")
  }
 }

 function saveProfile(event: FormEvent) {
  event.preventDefault()
  const result = updateProfile({ name: profileName, email: profileEmail, avatar: user?.avatar })
  if (!result.ok) {
   toast.error(result.error ?? "Não foi possível atualizar o perfil.")
   return
  }
  setEditOpen(false)
  toast.success("Perfil atualizado.")
 }

 const statItems = [
  { label: "Saldo total", mobileLabel: "Saldo", value: formatCurrency(stats.balance), detail: "posição da conta", tone: stats.balance >= 0 ? "text-success" : "text-destructive" },
  { label: "Receitas do mês", mobileLabel: "Receitas", value: formatCurrency(stats.income), detail: changeLabel(stats.comparison.incomeChange), tone: "text-success" },
  { label: "Despesas do mês", mobileLabel: "Despesas", value: formatCurrency(stats.expense), detail: changeLabel(stats.comparison.expenseChange), tone: "text-destructive" },
 ]

 return (
  <div className="min-w-0">
   <div className="hidden">
    <PageHeader title="Minha conta" subtitle="Conta, preferências e privacidade." />
   </div>

   <div className="md:hidden">
    <section aria-labelledby="mobile-identity-heading" className="flex flex-col items-center pb-6 pt-2 text-center">
     <h1 id="mobile-identity-heading" className="sr-only">Minha conta</h1>
     <div className="relative">
      <Avatar className="h-20 w-20 ring-2 ring-primary/20 ring-offset-4 ring-offset-background">
       <AvatarImage src={avatarSrc} alt={user?.name ?? "Perfil"} className="object-cover object-[50%_28%]" />
       <AvatarFallback className="bg-primary/15 text-xl font-extrabold text-primary">{initials(user?.name)}</AvatarFallback>
      </Avatar>
      <button
       type="button"
       onClick={() => handlePhotoOpen(true)}
       aria-label="Alterar foto de perfil"
       className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
       <Camera aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
     </div>
     <div className="mt-3 flex items-center gap-1.5">
      <p className="text-base font-semibold">{user?.name ?? "PoupaByte"}</p>
      <button type="button" onClick={() => handleEditOpen(true)} className="rounded-md p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label="Editar perfil">
       <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
     </div>
     <p className="text-sm text-muted-foreground">{user?.email}</p>
    </section>

    <div className="mb-2 flex items-center border-y border-border py-4">
     {statItems.map((item, index) => (
      <Fragment key={item.label}>
       {index > 0 && <Separator orientation="vertical" className="h-8" />}
       <div className="min-w-0 flex-1 px-1 text-center">
        <p className={cn("truncate text-xs font-semibold tabular-nums min-[390px]:text-sm", item.tone)}>{item.value}</p>
        <p className="mt-0.5 truncate text-[9px] uppercase tracking-wide text-muted-foreground">{item.mobileLabel}</p>
       </div>
      </Fragment>
     ))}
    </div>

    <nav aria-label="Configurações do perfil" className="flex flex-col">
     <ProfileMenuRow icon={Lock} title="Segurança" subtitle="Senha, sessões ativas" href={ROUTES.profileSecurity} />
     <Separator />
     <ProfileMenuRow icon={SlidersHorizontal} title="Preferências" subtitle="Tema, notificações" href={ROUTES.profilePreferences} />
     <Separator />
     <ProfileMenuRow icon={ShieldCheck} title="Dados e privacidade" subtitle="Exportar dados, termos" href={ROUTES.profilePrivacy} />
    </nav>

    <div className="flex flex-col items-center gap-3 pb-4 pt-8">
     <button type="button" onClick={() => setResetOpen(true)} className="flex items-center gap-2 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:underline">
      <RefreshCcw aria-hidden="true" className="h-4 w-4" />Restaurar demo
     </button>
     <button type="button" onClick={handleLogout} className="flex items-center gap-2 text-sm text-destructive outline-none hover:text-destructive/80 focus-visible:underline">
      <LogOut aria-hidden="true" className="h-4 w-4" />Sair
     </button>
    </div>
   </div>

   <div className="hidden w-full max-w-3xl flex-col gap-10 md:flex">
    <section aria-labelledby="identity-heading">
     <SectionLabel id="identity-heading" icon={UserRound}>Identidade</SectionLabel>
     <div className="flex items-center justify-between gap-6">
      <div className="flex min-w-0 items-center gap-4">
       <button
        type="button"
        aria-label="Alterar foto de perfil"
        className="group relative h-16 w-16 shrink-0 cursor-pointer rounded-full outline-none ring-2 ring-primary/20 ring-offset-2 ring-offset-background focus-visible:ring-primary/60"
        onClick={() => handlePhotoOpen(true)}
       >
        <Avatar className="h-16 w-16 overflow-hidden rounded-full">
         <AvatarImage src={avatarSrc} alt={user?.name ?? "Perfil"} className="object-cover object-[50%_28%]" />
         <AvatarFallback className="bg-primary/15 text-lg font-extrabold text-primary">{initials(user?.name)}</AvatarFallback>
        </Avatar>
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/50 group-focus-visible:bg-black/50">
         <Camera aria-hidden="true" className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        </span>
       </button>
       <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
         <p className="truncate text-lg font-semibold">{user?.name ?? "PoupaByte"}</p>
         <StatusDot label="Demonstração" />
         <button type="button" onClick={() => handleEditOpen(true)} className="rounded-md p-1 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label="Editar perfil">
          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
         </button>
        </div>
        <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Membro desde {formatMonthYear(user?.createdAt)}</p>
       </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
       <Button variant="secondary" className="gap-2 border" onClick={() => setResetOpen(true)}><RefreshCcw className="h-4 w-4" />Restaurar demo</Button>
       <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={handleLogout}><LogOut className="h-4 w-4" />Sair</Button>
      </div>
     </div>
    </section>

    <Separator />
    <section aria-labelledby="security-heading">
     <SectionLabel id="security-heading" icon={Lock}>Segurança</SectionLabel>
     <SecuritySettings />
    </section>

    <Separator />
    <section aria-labelledby="preferences-heading">
     <SectionLabel id="preferences-heading" icon={SlidersHorizontal}>Preferências</SectionLabel>
     <PreferencesSettings />
    </section>

    <Separator />
    <section aria-labelledby="current-heading">
     <SectionLabel id="current-heading" icon={BarChart3}>Situação atual</SectionLabel>
     <StatStrip items={statItems} />
    </section>

    <Separator />
    <section aria-labelledby="privacy-heading">
     <SectionLabel id="privacy-heading" icon={ShieldCheck}>Dados e privacidade</SectionLabel>
     <PrivacySettings />
    </section>
   </div>

   <Dialog open={photoOpen} onOpenChange={handlePhotoOpen}>
    <DialogContent>
     <DialogHeader><DialogTitle>Alterar foto</DialogTitle><DialogDescription>Escolha uma nova imagem de perfil.</DialogDescription></DialogHeader>
     <div className="app-responsive-modal-body flex flex-col items-center gap-5 px-6 py-5">
      <Avatar className="h-24 w-24"><AvatarImage src={photoPreview || avatarSrc} alt="Prévia da foto" className="object-cover" /><AvatarFallback className="bg-primary/15 text-xl font-extrabold text-primary">{initials(user?.name)}</AvatarFallback></Avatar>
      <Input ref={fileInputRef} id="avatar-file" type="file" accept="image/*" className="sr-only" onChange={handleAvatarFile} />
      <Button type="button" variant="outline" asChild><label htmlFor="avatar-file" className="cursor-pointer"><Camera className="h-4 w-4" />Escolher arquivo</label></Button>
      <p className="text-center text-xs text-muted-foreground">JPG, PNG ou WebP de até 2 MB.</p>
     </div>
     <DialogFooter><Button type="button" variant="outline" onClick={() => setPhotoOpen(false)}>Cancelar</Button><Button type="button" onClick={savePhoto}>Salvar foto</Button></DialogFooter>
    </DialogContent>
   </Dialog>

   <Dialog open={editOpen} onOpenChange={handleEditOpen}>
    <DialogContent>
     <DialogHeader><DialogTitle>Editar perfil</DialogTitle><DialogDescription>Atualize seus dados de identificação.</DialogDescription></DialogHeader>
     <form onSubmit={saveProfile}>
      <div className="space-y-4 px-6 py-5">
       <div className="space-y-1.5"><Label htmlFor="profile-name">Nome</Label><Input id="profile-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} required /></div>
       <div className="space-y-1.5"><Label htmlFor="profile-email">E-mail</Label><Input id="profile-email" type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} required /></div>
      </div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button><Button type="submit">Salvar alterações</Button></DialogFooter>
     </form>
    </DialogContent>
   </Dialog>

   <Dialog open={resetOpen} onOpenChange={setResetOpen}>
    <DialogContent>
     <DialogHeader><DialogTitle>Restaurar dados da demonstração?</DialogTitle><DialogDescription>Transações, metas, limites e notificações voltarão ao conjunto inicial do PoupaByte.</DialogDescription></DialogHeader>
     <DialogFooter><Button type="button" variant="outline" onClick={() => setResetOpen(false)}>Cancelar</Button><Button type="button" onClick={() => { resetDemoData(); setResetOpen(false) }}>Restaurar</Button></DialogFooter>
    </DialogContent>
   </Dialog>
  </div>
 )
}

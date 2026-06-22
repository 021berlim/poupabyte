"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ROUTES } from "@/lib/routes"
import { useStore } from "@/lib/store"
import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { TOAST } from "@/lib/copy"

export default function SignupPage() {
 const { register, user, hydrated, onboardingCompleted } = useStore()
 const router = useRouter()
 const [name, setName] = useState("")
 const [email, setEmail] = useState("")
 const [password, setPassword] = useState("")
 const [show, setShow] = useState(false)
 const [loading, setLoading] = useState(false)

 useEffect(() => {
  if (hydrated && user && !onboardingCompleted) {
   router.replace(ROUTES.onboarding)
  }
 }, [hydrated, user, onboardingCompleted, router])

 function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  if (password.length < 6) {
   toast.error("A senha deve ter ao menos 6 caracteres.")
   return
  }
  setLoading(true)
  const res = register(name.trim(), email.trim(), password)
  if (res.ok) {
   toast.success(TOAST.success.accountCreated)
   router.replace(ROUTES.onboarding)
   return
  }
  toast.error(res.error ?? TOAST.error.signup)
  setLoading(false)
 }

 return (
  <AuthShell>
   <div>
    <h2 className="text-[clamp(1.5rem,6vw,1.75rem)] font-extrabold tracking-tight">Criar conta</h2>
    <p className="mt-1.5 text-sm text-muted-foreground">
     Leva menos de um minuto.
    </p>

    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
     <div className="space-y-1.5">
      <Label htmlFor="name">Nome completo</Label>
      <Input
       id="name"
       required
       value={name}
       onChange={(e) => setName(e.target.value)}
       placeholder="Seu nome"
      />
     </div>

     <div className="space-y-1.5">
      <Label htmlFor="email">E-mail</Label>
      <Input
       id="email"
       type="email"
       autoComplete="email"
       required
       value={email}
       onChange={(e) => setEmail(e.target.value)}
       placeholder="voce@email.com"
      />
     </div>

     <div className="space-y-1.5">
      <Label htmlFor="password">Senha</Label>
      <div className="relative">
       <Input
        id="password"
        type={show ? "text" : "password"}
        autoComplete="new-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mínimo de 6 caracteres"
       />
       <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
       >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
       </button>
      </div>
     </div>

     <Button type="submit" className="w-full" size="lg" disabled={loading}>
      {loading ? (
       <>
        <span className="sr-only">Criando conta</span>
        <span aria-hidden="true" className="h-4 w-24 animate-pulse rounded bg-primary-foreground/70" />
       </>
      ) : (
       "Criar conta"
      )}
     </Button>
    </form>

    <p className="mt-6 text-center text-sm text-muted-foreground">
     Já tem uma conta?{" "}
     <Link href="/login" className="font-semibold text-primary hover:underline">
      Entrar
     </Link>
    </p>
   </div>
  </AuthShell>
 )
}
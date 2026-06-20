"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { APP_HOME } from "@/lib/routes"
import { useStore } from "@/lib/store"
import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

export default function LoginPage() {
 const { login, user, hydrated } = useStore()
 const router = useRouter()
 const [email, setEmail] = useState("")
 const [password, setPassword] = useState("")
 const [show, setShow] = useState(false)
 const [loading, setLoading] = useState(false)

 useEffect(() => {
  if (hydrated && user) router.replace(APP_HOME)
 }, [hydrated, user, router])

 function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)
  setTimeout(() => {
   const res = login(email.trim(), password)
   if (res.ok) {
    toast.success("Bem-vindo de volta!")
    router.replace(APP_HOME)
   } else {
    toast.error(res.error ?? "Não foi possível entrar.")
    setLoading(false)
   }
  }, 600)
 }

 return (
  <AuthShell>
   <div>
    <h2 className="text-[clamp(1.5rem,6vw,1.75rem)] font-extrabold tracking-tight">Entrar na sua conta</h2>
    <p className="mt-1.5 text-sm text-muted-foreground">
     Acesse o painel e gerencie suas finanças.
    </p>

    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
      <div className="flex items-center justify-between">
       <Label htmlFor="password">Senha</Label>
       <Link
        href="/forgot-password"
        className="text-xs font-medium text-primary hover:underline"
       >
        Esqueceu a senha?
       </Link>
      </div>
      <div className="relative">
       <Input
        id="password"
        type={show ? "text" : "password"}
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
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
        <span className="sr-only">Entrando</span>
        <span aria-hidden="true" className="h-4 w-16 animate-pulse rounded bg-primary-foreground/70" />
       </>
      ) : (
       "Entrar"
      )}
     </Button>
    </form>

    <p className="mt-6 text-center text-sm text-muted-foreground">
     Ainda não tem conta?{" "}
     <Link href="/signup" className="font-semibold text-primary hover:underline">
      Cadastre-se
     </Link>
    </p>
   </div>
  </AuthShell>
 )
}

"use client"

import { useState } from "react"
import Link from "next/link"
import { useStore } from "@/lib/store"
import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, MailCheck } from "lucide-react"
import { toast } from "sonner"
import { TOAST } from "@/lib/copy"

export default function ForgotPasswordPage() {
 const { resetPassword } = useStore()
 const [email, setEmail] = useState("")
 const [loading, setLoading] = useState(false)
 const [sent, setSent] = useState(false)

 function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)
  setTimeout(() => {
   const res = resetPassword(email.trim())
   setLoading(false)
   if (res.ok) {
    setSent(true)
   } else {
    toast.error(res.error ?? TOAST.error.emailNotFound)
   }
  }, 700)
 }

 return (
  <AuthShell>
   <div>
    <Link
     href="/login"
     className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
     <ArrowLeft className="h-4 w-4" />
     Voltar para o login
    </Link>

    {sent ? (
     <div className="rounded-2xl border border-success/30 bg-success/10 p-[clamp(1rem,4vw,1.5rem)] text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15 text-success">
       <MailCheck className="h-6 w-6" />
      </span>
      <h2 className="text-lg font-bold">Instruções enviadas</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
       Se houver uma conta para <strong className="break-all text-foreground">{email}</strong>,
       você receberá um link de redefinição. (Simulação para demonstração.)
      </p>
      <Button asChild className="mt-5 w-full" variant="secondary">
       <Link href="/login">Voltar ao login</Link>
      </Button>
     </div>
    ) : (
     <>
      <h2 className="text-[clamp(1.5rem,6vw,1.75rem)] font-extrabold tracking-tight">Recuperar senha</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
       Informe seu e-mail e enviaremos instruções para redefinir sua senha.
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

       <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? (
         <>
          <span className="sr-only">Enviando instruções</span>
          <span aria-hidden="true" className="h-4 w-32 animate-pulse rounded bg-primary-foreground/70" />
         </>
        ) : (
         "Enviar instruções"
        )}
       </Button>
      </form>
     </>
    )}
   </div>
  </AuthShell>
 )
}

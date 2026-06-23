import { BrandLogo } from "@/components/brand-logo"
import { cn } from "@/lib/utils"
import { ShieldCheck, TrendingUp, Target } from "lucide-react"

export function AuthShell({
 children,
 compact = false,
 branding = true,
 wide = false,
}: {
 children: React.ReactNode
 compact?: boolean
 branding?: boolean
 wide?: boolean
}) {
 return (
  <div className="flex min-h-dvh w-full overflow-x-hidden bg-background">
   {branding ? (
   <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-secondary p-[clamp(2rem,4vw,3rem)] text-secondary-foreground lg:flex">
    <div
     aria-hidden="true"
     className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/25 blur-3xl"
    />
    <div
     aria-hidden="true"
     className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-primary/15 blur-3xl"
    />

    <div className="relative">
     <BrandLogo size="lg" iconVariant="white" className="[&_span]:text-white" />
    </div>

    <div className="relative max-w-md">
     <h1 className="text-balance text-[clamp(2rem,4vw,2.5rem)] font-extrabold leading-tight">
      Suas finanças, do seu jeito.
     </h1>
     <p className="mt-4 text-pretty text-base text-secondary-foreground/70">
      Organize entradas, gastos e metas em uma visão simples do seu mês.
     </p>

     <ul className="mt-[clamp(2rem,5vh,2.5rem)] space-y-4">
      {[
       { icon: TrendingUp, text: "Veja para onde seu dinheiro vai" },
       { icon: Target, text: "Acompanhe limites e metas" },
       { icon: ShieldCheck, text: "Receba análises da Penny quando precisar" },
      ].map(({ icon: Icon, text }) => (
       <li key={text} className="flex items-center gap-3 text-sm">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/20 text-primary">
         <Icon className="h-4.5 w-4.5" />
        </span>
        {text}
       </li>
      ))}
     </ul>
    </div>

    <p className="relative text-xs text-secondary-foreground/50">
     PoupaByte — Demonstração. Dados simulados, sem integração bancária real.
    </p>
   </aside>
   ) : null}

   <main
    className={cn(
     "flex min-h-dvh min-w-0 flex-col items-center justify-center overflow-x-hidden px-[clamp(1rem,5vw,2rem)] py-[clamp(2rem,8svh,3.5rem)]",
     branding && "lg:w-1/2",
     compact && "h-dvh overflow-hidden py-5 lg:h-auto lg:min-h-dvh",
    )}
   >
    <div className={cn("w-full min-w-0", wide ? "max-w-md" : "max-w-sm")}>
     <div className={compact ? "mb-4 lg:hidden" : "mb-[clamp(1.5rem,6vw,2rem)] lg:hidden"}>
      <BrandLogo size="md" />
     </div>
     {children}
    </div>
   </main>
  </div>
 )
}

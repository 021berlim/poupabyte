import { AuthGuard } from "@/components/auth-guard"
import { AppShell } from "@/components/app/app-shell"
import { Providers } from "@/components/providers"

export default function AppLayout({ children }: { children: React.ReactNode }) {
 return (
  <Providers>
   <AuthGuard>
    <AppShell>{children}</AppShell>
   </AuthGuard>
  </Providers>
 )
}

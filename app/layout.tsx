import type { Metadata } from "next"
import Script from "next/script"
import { Analytics } from "@/components/analytics"
import { Providers } from "@/components/providers"
import "./globals.css"
import "./modal-responsive.css"

const sidebarStateScript = `
(() => {
 try {
  const state = window.localStorage.getItem("poupabyte:sidebar-state") === "collapsed" ? "collapsed" : "expanded";
  document.documentElement.dataset.sidebarState = state;
 } catch (_) {
  document.documentElement.dataset.sidebarState = "expanded";
 }
})();
`

const themeScript = `
(() => {
 try {
  const storedTheme = window.localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = storedTheme === "light" || (storedTheme === "system" && !prefersDark) ? "light" : "dark";
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
  document.documentElement.style.colorScheme = theme;
 } catch (_) {
  document.documentElement.classList.add("dark");
  document.documentElement.style.colorScheme = "dark";
 }
})();
`

export const metadata: Metadata = {
 title: "PoupaByte — Suas finanças, organizadas",
 description:
  "Controle receitas, despesas, metas e limites em um só lugar.",
 generator: "v0.app",
}

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode
}>) {
 return (
  <html lang="pt-BR" className="bg-background" suppressHydrationWarning>
   <body className="font-sans antialiased" suppressHydrationWarning>
    <Script id="theme-state" strategy="beforeInteractive">
     {themeScript}
    </Script>
    <Script id="sidebar-state" strategy="beforeInteractive">
     {sidebarStateScript}
    </Script>
    <Providers>{children}</Providers>
    <Analytics />
   </body>
  </html>
 )
}

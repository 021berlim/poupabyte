"use client"

import { useEffect, useState } from "react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
 const { resolvedTheme, setTheme } = useTheme()
 const [mounted, setMounted] = useState(false)

 useEffect(() => {
  const frame = requestAnimationFrame(() => setMounted(true))
  return () => cancelAnimationFrame(frame)
 }, [])

 return (
  <Button
   variant="ghost"
   size="icon"
   aria-label="Alternar tema"
   className="h-10 w-10 rounded-2xl border border-border/70 bg-card/80 hover:bg-card"
   onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
  >
   {mounted && resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
  </Button>
 )
}

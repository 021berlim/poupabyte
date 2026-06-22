"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuLabel,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TOAST } from "@/lib/copy"
import { ROUTES } from "@/lib/routes"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { ChevronDown, FolderTree, LogOut, RotateCcw, UserRound } from "lucide-react"
import { toast } from "sonner"

const DEFAULT_AVATAR_SRC = "/images/onboarding-hero.jpg"

function initials(name?: string) {
 if (!name) return "PB"

 return name
  .split(" ")
  .slice(0, 2)
  .map((part) => part[0])
  .join("")
  .toUpperCase()
}

type ProfileMenuProps = {
 className?: string
 variant?: "mobile" | "desktop"
}

export function ProfileMenu({ className, variant = "desktop" }: ProfileMenuProps) {
 const router = useRouter()
 const { user, logout, resetDemoData } = useStore()
 const isMobile = variant === "mobile"
 const firstName = user?.name.split(" ")[0] ?? "Conta"
 const avatarSrc = user?.avatar ?? DEFAULT_AVATAR_SRC

 function handleLogout() {
  logout()
  toast.success(TOAST.success.sessionEnded)
  router.replace("/login")
 }

 function handleRestoreDemo() {
  resetDemoData()
 }

 return (
  <DropdownMenu>
   <DropdownMenuTrigger asChild>
    <Button
     variant="ghost"
     aria-label="Abrir menu da minha conta"
     className={cn(
      isMobile
       ? "h-10 max-w-[230px] justify-start gap-2 rounded-2xl bg-transparent p-0 pr-2 text-foreground hover:bg-transparent"
       : "h-10 w-10 rounded-2xl bg-transparent p-0 hover:bg-transparent",
      className,
     )}
    >
     <Avatar
      className={cn(
       "border-2 border-primary ",
       isMobile ? "h-8 w-8" : "h-9 w-9",
      )}
     >
      <AvatarImage
       src={avatarSrc}
       alt={user?.name ?? "Perfil"}
       className="object-cover object-[50%_28%]"
      />
      <AvatarFallback className="bg-primary text-xs font-extrabold text-primary-foreground">
       {initials(user?.name)}
      </AvatarFallback>
     </Avatar>
     {isMobile ? (
      <>
       <span className="truncate text-sm font-semibold">{firstName}</span>
       <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </>
     ) : null}
    </Button>
   </DropdownMenuTrigger>
   <DropdownMenuContent
    align={isMobile ? "start" : "end"}
    sideOffset={10}
    className="w-[min(calc(100dvw-2rem),18rem)] rounded-2xl border-border/70 bg-card/95 p-2 backdrop-blur-xl"
   >
    <DropdownMenuLabel className="p-2">
     <div className="flex items-center gap-3">
      <Avatar className="h-11 w-11 border-2 border-primary">
       <AvatarImage
        src={avatarSrc}
        alt={user?.name ?? "Perfil"}
        className="object-cover object-[50%_28%]"
       />
       <AvatarFallback className="bg-primary text-sm font-extrabold text-primary-foreground">
        {initials(user?.name)}
       </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
       <p className="truncate text-sm font-extrabold">{user?.name ?? "PoupaByte"}</p>
       <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
      </div>
     </div>
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem asChild className="rounded-2xl px-3 py-2.5">
     <Link href={ROUTES.profile}>
      <UserRound className="h-4 w-4" />
      <span>Minha conta</span>
     </Link>
    </DropdownMenuItem>
    <DropdownMenuItem asChild className="rounded-2xl px-3 py-2.5">
     <Link href={ROUTES.categories}>
      <FolderTree className="h-4 w-4" />
      <span>Categorias</span>
     </Link>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem
     className="rounded-2xl px-3 py-2.5"
     onSelect={handleRestoreDemo}
    >
     <RotateCcw className="h-4 w-4" />
     <span>Restaurar demo</span>
    </DropdownMenuItem>
    <DropdownMenuItem
     variant="destructive"
     className="rounded-2xl px-3 py-2.5"
     onSelect={handleLogout}
    >
     <LogOut className="h-4 w-4" />
     <span>Sair</span>
    </DropdownMenuItem>
   </DropdownMenuContent>
  </DropdownMenu>
 )
}

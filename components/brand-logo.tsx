import Image from "next/image"
import { cn } from "@/lib/utils"

const brandIconDark = "/Logo%20PoupaByte%20Icon.png"
const brandIconLight = "/Logo%20PoupaByte%20Icon%20Preta.png"

type BrandIconVariant = "auto" | "white" | "black"

function BrandIconImage({
 className,
 src,
}: {
 className?: string
 src: string
}) {
 return (
  <Image
   src={src}
   alt=""
   width={2000}
   height={2000}
   sizes="44px"
   decoding="async"
   draggable={false}
   className={cn("h-full w-full object-contain", className)}
  />
 )
}

export function BrandMark({
 className,
 variant = "auto",
}: {
 className?: string
 variant?: BrandIconVariant
}) {
 const forcedIcon = variant === "white" ? brandIconDark : variant === "black" ? brandIconLight : null

 return (
  <span
   className={cn(
    "inline-flex shrink-0 items-center justify-center overflow-visible",
    className,
   )}
   aria-hidden="true"
  >
   {forcedIcon ? (
    <BrandIconImage src={forcedIcon} />
   ) : (
    <>
     <BrandIconImage src={brandIconLight} className="dark:hidden" />
     <BrandIconImage src={brandIconDark} className="hidden dark:block" />
    </>
   )}
  </span>
 )
}

export function BrandLogo({
 className,
 iconVariant,
 size = "md",
}: {
 className?: string
 iconVariant?: BrandIconVariant
 size?: "sm" | "md" | "lg"
}) {
 const markSize = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-10 w-10" : "h-11 w-11"
 const textSize = size === "lg" ? "text-3xl" : size === "sm" ? "text-xl" : "text-2xl"
 return (
  <div className={cn("flex items-center gap-2.5", className)}>
   <BrandMark className={markSize} variant={iconVariant} />
   <span className={cn("font-extrabold text-foreground", textSize)}>
    Poupa<span className="text-primary">Byte</span>
   </span>
  </div>
 )
}

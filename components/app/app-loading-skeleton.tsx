import { Skeleton } from "@/components/ui/skeleton"

export function AppLoadingSkeleton() {
 return (
  <div className="min-h-dvh overflow-x-hidden bg-background p-[clamp(1rem,4vw,2rem)]">
   <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-[1480px] gap-[clamp(1rem,3vw,1.5rem)]">
    <div className="hidden w-64 shrink-0 space-y-5 border-r border-border/70 p-4 md:block">
     <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-2xl" />
      <Skeleton className="h-5 w-32" />
     </div>
     <div className="space-y-2 pt-3">
      {Array.from({ length: 6 }).map((_, index) => (
       <Skeleton key={index} className="h-11 w-full rounded-2xl" />
      ))}
     </div>
    </div>

    <main className="min-w-0 flex-1 space-y-5 pt-12">
     <div className="space-y-2">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-12 w-64 max-w-full" />
     </div>

     <div className="grid gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(min(100%,340px),0.95fr)]">
      <Skeleton className="h-[272px] rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
       <Skeleton className="h-[130px] rounded-2xl" />
       <Skeleton className="h-[130px] rounded-2xl" />
      </div>
     </div>

     <div className="grid gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(min(100%,340px),0.95fr)]">
      <Skeleton className="h-[430px] rounded-2xl" />
      <Skeleton className="h-[430px] rounded-2xl" />
     </div>
    </main>
   </div>
  </div>
 )
}

import { redirect } from "next/navigation"

export function createLegacyRouteRedirectPage(destination: string) {
  return function LegacyRouteRedirectPage() {
    redirect(destination)
  }
}
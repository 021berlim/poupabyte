"use client"

import { FinancialPlanningSettings } from "@/components/profile/financial-planning-settings"
import { PreferencesSettings, ProfileSubpage } from "@/components/profile/profile-settings"

export default function PreferencesPage() {
 return (
  <ProfileSubpage title="Preferências">
   <PreferencesSettings />
   <div className="mt-8">
    <FinancialPlanningSettings />
   </div>
  </ProfileSubpage>
 )
}

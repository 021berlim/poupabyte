"use client"

import { SelectItem, SelectSeparator } from "@/components/ui/select"

export const MANAGE_CATEGORIES_SELECT_VALUE = "__manage_categories__"

export function isManageCategoriesSelectValue(value: string) {
  return value === MANAGE_CATEGORIES_SELECT_VALUE
}

export function ManageCategoriesSelectOption() {
  return (
    <>
      <SelectSeparator />
      <SelectItem value={MANAGE_CATEGORIES_SELECT_VALUE} className="font-semibold text-primary">
        + Gerenciar categorias
      </SelectItem>
    </>
  )
}
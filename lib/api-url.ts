const isCapacitorExport = process.env.NEXT_PUBLIC_CAPACITOR_EXPORT === "true"

function normalizeBaseUrl(value: string | undefined) {
  return value?.trim().replace(/\/+$/, "") ?? ""
}

export function apiUrl(path: string) {
  if (!path.startsWith("/")) {
    throw new Error("apiUrl expects an absolute path")
  }

  const apiBaseUrl = isCapacitorExport
    ? normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_APP_URL)
    : ""

  return apiBaseUrl ? `${apiBaseUrl}${path}` : path
}

import { spawnSync } from "node:child_process"
import { join } from "node:path"

const nextBin = join("node_modules", "next", "dist", "bin", "next")
const result = spawnSync(process.execPath, [nextBin, "build"], {
  env: {
    ...process.env,
    CAPACITOR_EXPORT: "true",
    NEXT_PUBLIC_CAPACITOR_EXPORT: "true",
  },
  stdio: "inherit",
})

process.exit(result.status ?? 1)

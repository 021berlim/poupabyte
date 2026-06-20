import { spawnSync } from "node:child_process"
import { join } from "node:path"

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const capBin = join("node_modules", "@capacitor", "cli", "bin", "capacitor")

run(process.execPath, [join("scripts", "build-android.mjs")])
run(process.execPath, [capBin, "sync", "android"])

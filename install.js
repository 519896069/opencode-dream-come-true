import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from "fs"
import { join, resolve } from "path"
import { homedir } from "os"
import { fileURLToPath } from "url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

function getConfigDir() {
  if (process.platform === "win32") {
    return join(homedir(), "AppData", "Roaming", "opencode")
  }
  return join(homedir(), ".config", "opencode")
}

function copyDir(src, dest) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true })
  const entries = readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

const isInstalled = process.env.npm_config_global !== "true"
const action = process.argv[2]

if (action === "link" || isInstalled) {
  const configDir = getConfigDir()
  const pkgRoot = resolve(__dirname)

  console.log("dream-come-true: installing to", configDir)

  const agentsSrc = join(pkgRoot, "assets", "agents")
  if (existsSync(agentsSrc)) {
    copyDir(agentsSrc, join(configDir, "agents"))
    console.log("  agents installed")
  }

  const skillsSrc = join(pkgRoot, "assets", "skills")
  if (existsSync(skillsSrc)) {
    copyDir(skillsSrc, join(configDir, "skills"))
    console.log("  skills installed")
  }

  const pipelineTemplate = join(pkgRoot, "template", "pipeline.config.json")
  if (existsSync(pipelineTemplate)) {
    copyFileSync(pipelineTemplate, join(configDir, "pipeline.config.json"))
    console.log("  pipeline.config.json installed to", configDir)
  }

  console.log("")
  console.log("To complete setup, add to your ~/.config/opencode/opencode.json:")
  console.log('  "plugin": ["dream-come-true"]')
  console.log("")
  console.log("And copy agent config from:")
  console.log("  https://github.com/519896069/opencode-dream-come-true#opencodejson")
  console.log("")
} else {
  console.log("dream-come-true v2.0.0 installed.")
  console.log("Run: npx dream-come-true setup")
}

const { existsSync, mkdirSync, copyFileSync, readdirSync, readFileSync, writeFileSync } = require("fs")
const { join, resolve } = require("path")
const { homedir } = require("os")

function getConfigDir() {
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

const action = process.argv[2]

if (action !== "skip") {
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

  // copy plugin entry point to plugins/
  const pluginSrc = join(pkgRoot, "dct-engine.ts")
  const pluginDest = join(configDir, "plugins", "dream-come-true.ts")
  if (existsSync(pluginSrc)) {
    const pluginsDir = join(configDir, "plugins")
    if (!existsSync(pluginsDir)) mkdirSync(pluginsDir, { recursive: true })
    copyFileSync(pluginSrc, pluginDest)
    console.log("  plugin entry installed to", pluginDest)
  }

  // auto-register plugin in opencode.json
  const configPath = join(configDir, "opencode.json")
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, "utf-8")
      const config = JSON.parse(raw)
      let changed = false

      // register plugin
      if (!config.plugin) config.plugin = []
      if (!config.plugin.includes("dream-come-true")) {
        config.plugin.push("dream-come-true")
        changed = true
        console.log("  plugin registered in opencode.json")
      } else {
        console.log("  plugin already registered in opencode.json")
      }

      // register captain as main agent
      if (!config.agent) config.agent = {}
      if (!config.agent.captain) {
        config.agent.captain = {}
        changed = true
        console.log("  captain agent registered in opencode.json")
      } else {
        console.log("  captain agent already registered in opencode.json")
      }

      if (changed) {
        writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n")
      }
    } catch (e) {
      console.log("  warning: failed to update opencode.json:", e.message)
      console.log('  please manually add "plugin": ["dream-come-true"] to opencode.json')
    }
  } else {
    console.log("  warning: opencode.json not found, please create it manually")
  }
} else {
  console.log("dream-come-true v2.0.0 installed.")
  console.log("Run: npx dream-come-true setup")
}

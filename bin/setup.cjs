const { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } = require("fs")
const { join, resolve, basename } = require("path")
const { homedir } = require("os")

const configDir = join(homedir(), ".config", "opencode")
const configPath = join(configDir, "opencode.json")

function parseAgent(srcDir, name) {
  const raw = readFileSync(join(srcDir, name + ".md"), "utf-8")
  const m = raw.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return null
  const front = {}
  let curKey = ""
  for (const line of m[1].split("\n")) {
    const indent = (line.match(/^(\s*)/)?.[1] || "").length
    const kv = line.match(/^(\w+):\s*(.*)/)
    if (indent === 0 && kv) {
      curKey = kv[1]
      const v = kv[2].trim()
      front[curKey] = v === "true" ? true : v === "false" ? false : v
    }
  }
  return front
}

function setup(agentsDir) {
  if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true })

  let config = {}
  if (existsSync(configPath)) {
    try { config = JSON.parse(readFileSync(configPath, "utf-8")) } catch {}
  }

  if (!config.agent) config.agent = {}
  if (!config.plugin) config.plugin = []

  let updated = false

  if (!config.plugin.includes("dream-come-true")) {
    config.plugin.push("dream-come-true")
    updated = true
  }

  const agentFiles = readdirSync(agentsDir).filter(f => f.endsWith(".md"))
  let count = 0
  for (const f of agentFiles) {
    const name = basename(f, ".md")
    if (config.agent[name]) continue
    const front = parseAgent(agentsDir, name)
    if (!front) continue
    const cfg = {}
    if (front.mode) cfg.mode = front.mode
    if (front.color) cfg.color = front.color
    if (front.hidden === true) cfg.hidden = true
    if (front.description) cfg.description = front.description
    if (Object.keys(cfg).length) { config.agent[name] = cfg; updated = true; count++ }
  }

  if (updated) {
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n")
  }
  return count
}

module.exports = { setup }

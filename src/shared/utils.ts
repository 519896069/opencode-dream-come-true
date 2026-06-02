import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs"
import { join } from "path"

export function readFile(path: string): string {
  return readFileSync(path, "utf-8")
}

export function writeFile(path: string, content: string): void {
  writeFileSync(path, content, "utf-8")
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T
}

export function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8")
}

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true })
}

export function fileExists(path: string): boolean {
  return existsSync(path)
}

export function extractTheme(content: string): string {
  return content.match(/# (.+?) - 状态追踪/)?.[1] || ""
}

export function slugify(text: string): string {
  const words = text.match(/[a-zA-Z0-9\u4e00-\u9fff]+/g) || []
  return words.slice(0, 3).join("-")
}

export function formatDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function generateBranch(version: string, brief: string): string {
  return `dev_${version}/feature_${brief}_fzp`
}

export function parseCommandFile(filePath: string) {
  const content = readFileSync(filePath, "utf-8")
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return null
  const frontmatter = match[1]
  const template = match[2].trim()
  const meta: Record<string, string> = {}
  for (const line of frontmatter.split("\n")) {
    const kv = line.match(/^(\w+)\s*:\s*(.+)$/)
    if (kv) meta[kv[1].trim()] = kv[2].trim()
  }
  return { meta, template }
}

export function parsePermission(permissionStr: string): Record<string, any> {
  const result: Record<string, any> = {}
  const lines = permissionStr.split("\n").filter(l => l.trim())
  for (const line of lines) {
    const match = line.match(/^(\w+)\s*:\s*(.+)$/)
    if (match) {
      result[match[1].trim()] = match[2].trim()
    }
  }
  return result
}

export async function loadCommandsFromDir(pluginRoot: string, logger?: any): Promise<Record<string, any>> {
  const commands: Record<string, any> = {}
  const pluginDir = join(pluginRoot, ".opencode", "commands")
  if (logger) await logger({ body: { service: "dream-come-true", level: "info", message: "loadCommandsFromDir", extra: { pluginRoot, pluginDir, exists: existsSync(pluginDir) } } })
  if (!existsSync(pluginDir)) return commands
  try {
    const files = readdirSync(pluginDir).filter(f => f.endsWith(".md"))
    for (const file of files) {
      const parsed = parseCommandFile(join(pluginDir, file))
      if (!parsed) continue
      const name = file.replace(/\.md$/, "").replace(/-/g, "_")
      commands[name] = {
        template: parsed.template,
        ...(parsed.meta.description && { description: parsed.meta.description }),
        ...(parsed.meta.agent && { agent: parsed.meta.agent }),
        ...(parsed.meta.model && { model: parsed.meta.model }),
        ...(parsed.meta.subtask && { subtask: parsed.meta.subtask === "true" }),
      }
    }
  } catch { /* ignore */ }
  return commands
}

export async function loadAgentsFromDir(pluginRoot: string, logger?: any): Promise<Record<string, any>> {
  const agents: Record<string, any> = {}
  const agentsDir = join(pluginRoot, ".agents")
  if (logger) await logger({ body: { service: "dream-come-true", level: "info", message: "loadAgentsFromDir", extra: { agentsDir, exists: existsSync(agentsDir) } } })
  if (!existsSync(agentsDir)) return agents

  try {
    const subdirs = readdirSync(agentsDir).filter(f => {
      return statSync(join(agentsDir, f)).isDirectory()
    })

    for (const subdir of subdirs) {
      const agentFile = join(agentsDir, subdir, "AGENTS.md")
      if (!existsSync(agentFile)) continue

      const content = readFileSync(agentFile, "utf-8")
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
      if (!match) continue

      const frontmatter = match[1]
      const meta: Record<string, any> = {}
      for (const line of frontmatter.split("\n")) {
        const kv = line.match(/^(\w+)\s*:\s*(.+)$/)
        if (kv) {
          let value = kv[2].trim()
          if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          meta[kv[1].trim()] = value
        }
      }

      const agentConfig: Record<string, any> = {
        description: meta.description || "",
        mode: meta.mode || "subagent",
        prompt: content,
      }
      if (meta.model) agentConfig.model = meta.model
      if (meta.temperature) agentConfig.temperature = parseFloat(meta.temperature)
      if (meta.color) agentConfig.color = meta.color
      if (meta.permission) agentConfig.permission = parsePermission(meta.permission)

      agents[subdir] = agentConfig
      if (logger) await logger({ body: { service: "dream-come-true", level: "info", message: "agent loaded", extra: { agent: subdir } } })
    }
  } catch (e) {
    if (logger) await logger({ body: { service: "dream-come-true", level: "error", message: "loadAgentsFromDir error", extra: { error: String(e) } } })
  }

  return agents
}

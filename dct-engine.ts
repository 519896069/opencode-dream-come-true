import { type Plugin } from "@opencode-ai/plugin"
import { existsSync, readFileSync } from "fs"
import { join, dirname } from "path"
import { execSync } from "child_process"
import { fileURLToPath } from "url"

import { createKanban } from "./src/kanban-manager.ts"
import { loadCommandsFromDir, loadAgentsFromDir } from "./src/shared/utils.ts"
import { createDctRun } from "./src/tools/dct-run.ts"
import { createDctValidate } from "./src/tools/dct-validate.ts"
import { createDctTaskContext } from "./src/tools/dct-task-context.ts"
import { createObsidianTool } from "./src/tools/obsidian.ts"
import type { ToolContext } from "./src/core.ts"

export const DreamComeTruePlugin: Plugin = async (ctx: any) => {
  const root = () => ctx.directory || process.cwd()
  const prdDir = () => join(root(), "prd")
  const pluginRoot = join(dirname(fileURLToPath(import.meta.url)))
  let currentVault = ""

  const toolCtx: ToolContext = {
    root,
    prdDir,
    findFiles: ctx.client.find.files.bind(ctx.client.find),
    currentVault,
    setCurrentVault: (v: string) => { currentVault = v },
  }

  const loadPluginConfig = () => {
    const projectConfigPath = join(root(), "dream-come-true.json")
    const pluginConfigPath = join(pluginRoot, "dream-come-true.json")
    const configPath = existsSync(projectConfigPath) ? projectConfigPath : pluginConfigPath
    if (existsSync(configPath)) {
      try {
        return JSON.parse(readFileSync(configPath, "utf-8"))
      } catch {
        return {}
      }
    }
    return {}
  }

  const logger = (msg: any) => ctx.client.app.log(msg)

  return {
    config: async (config) => {
      await logger({ body: { service: "dream-come-true", level: "info", message: "config hook executing", extra: { root: root(), pluginRoot } } })
      const pluginConfig = loadPluginConfig()
      if (pluginConfig.agents) {
        if (!config.agent) config.agent = {}
        Object.assign(config.agent, pluginConfig.agents)
      }

      const agentsFromDir = await loadAgentsFromDir(pluginRoot, logger)
      if (Object.keys(agentsFromDir).length > 0) {
        if (!config.agent) config.agent = {}
        Object.assign(config.agent, agentsFromDir)
      }

      const commands = await loadCommandsFromDir(pluginRoot, logger)
      if (Object.keys(commands).length > 0) {
        if (!config.command) config.command = {}
        Object.assign(config.command, commands)
      }
    },

    "tool.execute.after": async (input, output) => {
      if (input.tool !== "write" && input.tool !== "edit") return
      const filePath = output.metadata?.filepath as string
      if (!filePath || !filePath.endsWith(".md")) return
      const prdMatch = filePath.match(/[\\\/]prd[\\\/](.+)/)
      if (!prdMatch) return
      if (!currentVault) return
      const relativePath = `prd/${prdMatch[1]}`
      const uri = `obsidian://open?vault=${encodeURIComponent(currentVault)}&file=${encodeURIComponent(relativePath)}`
      const cmd = `start "obsidian" "${uri}"`
      try { execSync(cmd, { stdio: "pipe" }) } catch { /* Obsidian 未安装，忽略 */ }
    },

    tool: {
      dct_run: createDctRun(toolCtx),
      dct_validate: createDctValidate(toolCtx),
      dct_task_context: createDctTaskContext(toolCtx),
      obsidian: createObsidianTool(),
    },
  }
}

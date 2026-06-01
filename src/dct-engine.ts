import { tool } from "@opencode-ai/plugin"
import { existsSync, readFileSync, readdirSync, statSync } from "fs"
import { join, dirname } from "path"
import { execSync } from "child_process"
import { fileURLToPath } from "url"

import { getStages } from "./pipeline.ts"
import {
  findKanbanFile, findKanbanFileAlternative, parseKanban, saveKanban, findCurrentFromKanban,
  createKanban, markKanbanColumn, getKanbanSummary, getWorktreeFromKanban,
  syncTasksFromPlan, updateKanbanTask,
} from "./kanban-manager.ts"

// 添加本地递归搜索函数
function findKanbanFileRecursive(dir: string): string | null {
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        const result = findKanbanFileRecursive(fullPath)
        if (result) return result
      } else if (entry === "kanban.md") {
        return fullPath
      }
    }
  } catch (e) {
    // 忽略权限错误等
  }
  return null
}
import { extractProjectsFromDesign } from "./workspace-manager.ts"
import { setupWorktree } from "./worktree-builder.ts"
import { STAGE_INSTRUCTIONS } from "./stage-instructions.ts"
import { resolveSchema } from "./schema-resolver.ts"
import { fileExists } from "./utils.ts"
import { buildObsidianResult, type ObsidianAction } from "./obsidian-tool.ts"

export const DreamComeTrueImpl = async (ctx: any) => {
  const root = () => ctx.directory || process.cwd()
  const prdDir = () => join(root(), "prd")
  const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
  let currentVault = ""

  const loadPluginConfig = () => {
    // 优先从项目根目录加载，其次从插件目录加载
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

  const parseCommandFile = (filePath: string) => {
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

  const loadCommandsFromDir = async () => {
    const commands: Record<string, any> = {}
    const pluginDir = join(pluginRoot, ".opencode", "commands")
    await ctx.client.app.log({ body: { service: "dream-come-true", level: "info", message: "loadCommandsFromDir", extra: { pluginRoot, pluginDir, exists: existsSync(pluginDir) } } })
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

  // 解析 YAML 风格的 permission 对象
  const parsePermission = (permissionStr: string): Record<string, any> => {
    const result: Record<string, any> = {}
    // 处理简单的 key: value 格式
    const lines = permissionStr.split("\n").filter(l => l.trim())
    for (const line of lines) {
      const match = line.match(/^(\w+)\s*:\s*(.+)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim()
        result[key] = value
      }
    }
    return result
  }

  // 从 .agents/ 目录加载 agent 配置
  const loadAgentsFromDir = async () => {
    const agents: Record<string, any> = {}
    const agentsDir = join(pluginRoot, ".agents")

    await ctx.client.app.log({ body: { service: "dream-come-true", level: "info", message: "loadAgentsFromDir", extra: { agentsDir, exists: existsSync(agentsDir) } } })

    if (!existsSync(agentsDir)) return agents

    try {
      const subdirs = readdirSync(agentsDir).filter(f => {
        const fullPath = join(agentsDir, f)
        return statSync(fullPath).isDirectory()
      })

      for (const subdir of subdirs) {
        const agentFile = join(agentsDir, subdir, "AGENTS.md")
        if (!existsSync(agentFile)) continue

        const content = readFileSync(agentFile, "utf-8")
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
        if (!match) continue

        // 解析 frontmatter
        const frontmatter = match[1]
        const meta: Record<string, any> = {}
        for (const line of frontmatter.split("\n")) {
          const kv = line.match(/^(\w+)\s*:\s*(.+)$/)
          if (kv) {
            let value = kv[2].trim()
            // 去掉值两端的引号
            if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1)
            }
            meta[kv[1].trim()] = value
          }
        }

        // 转换为 opencode agent 配置
        const agentConfig: Record<string, any> = {
          description: meta.description || "",
          mode: meta.mode || "subagent",
          prompt: content, // 将整个 AGENTS.md 内容作为 prompt
        }

        // 添加可选配置
        if (meta.model) agentConfig.model = meta.model
        if (meta.temperature) agentConfig.temperature = parseFloat(meta.temperature)
        if (meta.color) agentConfig.color = meta.color
        if (meta.permission) agentConfig.permission = parsePermission(meta.permission)

        agents[subdir] = agentConfig
        await ctx.client.app.log({ body: { service: "dream-come-true", level: "info", message: "agent loaded from .agents dir", extra: { agent: subdir, config: JSON.stringify(agentConfig) } } })
      }
    } catch (e) {
      await ctx.client.app.log({ body: { service: "dream-come-true", level: "error", message: "loadAgentsFromDir error", extra: { error: String(e) } } })
    }

    return agents
  }

  return {
    config: async (config) => {
      await ctx.client.app.log({ body: { service: "dream-come-true", level: "info", message: "config hook executing", extra: { root: root(), pluginRoot, cwd: process.cwd() } } })
      const pluginConfig = loadPluginConfig()
      await ctx.client.app.log({ body: { service: "dream-come-true", level: "info", message: "pluginConfig loaded", extra: { config: JSON.stringify(pluginConfig), projectConfigPath: join(root(), "dream-come-true.json"), pluginConfigPath: join(pluginRoot, "dream-come-true.json"), projectConfigExists: existsSync(join(root(), "dream-come-true.json")), pluginConfigExists: existsSync(join(pluginRoot, "dream-come-true.json")) } } })
      if (pluginConfig.agents) {
        if (!config.agent) config.agent = {}
        Object.assign(config.agent, pluginConfig.agents)
        await ctx.client.app.log({ body: { service: "dream-come-true", level: "info", message: "agents merged", extra: { agents: Object.keys(pluginConfig.agents) } } })
      }

      // 从 .agents/ 目录加载 agent 配置（AGENTS.md 文件）
      const agentsFromDir = await loadAgentsFromDir()
      await ctx.client.app.log({ body: { service: "dream-come-true", level: "info", message: "config hook agent", extra: { agentsFromDir: agentsFromDir } } })

      if (Object.keys(agentsFromDir).length > 0) {
        if (!config.agent) config.agent = {}
        // .agents/ 目录中的配置优先级更高，覆盖 dream-come-true.json 中的配置
        Object.assign(config.agent, agentsFromDir)
        await ctx.client.app.log({ body: { service: "dream-come-true", level: "info", message: "agents loaded from .agents dir", extra: { agents: Object.keys(agentsFromDir) } } })
      }

      const commands = await loadCommandsFromDir()
      await ctx.client.app.log({ body: { service: "dream-come-true", level: "info", message: "commands loaded", extra: { commands: Object.keys(commands), count: Object.keys(commands).length } } })
      if (Object.keys(commands).length > 0) {
        if (!config.command) config.command = {}
        Object.assign(config.command, commands)
        await ctx.client.app.log({ body: { service: "dream-come-true", level: "info", message: "commands merged into config" } })
      }
    },

    "tool.execute.after": async (input, output) => {
      await ctx.client.app.log({ body: { service: "dream-come-true", level: "info", message: "tool.execute.after", extra: { input: input, args: { output: output } } } })
      if (input.tool !== "write" && input.tool !== "edit") return
      const filePath = output.metadata?.filepath as string
      if (!filePath || !filePath.endsWith(".md")) return
      const prdMatch = filePath.match(/[\\\/]prd[\\\/](.+)/)
      if (!prdMatch) return
      if (!currentVault) {
        const kanbanPath = await findKanbanFile(ctx.client.find.files.bind(ctx.client.find), prdDir())
        if (kanbanPath) {
          const kanban = parseKanban(kanbanPath)
          currentVault = kanban.meta.vault || ""
        }
      }
      if (!currentVault) return
      const relativePath = `prd/${prdMatch[1]}`
      const result = buildObsidianResult({ action: "open", vault: currentVault, file: relativePath })
      const cmd = JSON.parse(result).command
      try { execSync(cmd, { stdio: "pipe" }) } catch { /* Obsidian 未安装，忽略 */ }
    },

    tool: {
      captain_check: tool({
        description: "检查插件环境是否初始化。",
        args: {},
        async execute() {
          const testAuthPath = join(root(), ".opencode", "skills", "test-auth", "SKILL.md")
          if (existsSync(testAuthPath)) {
            return "环境已初始化"
          }
          return "环境未初始化"
        },
      }),

      captain_run: tool({
        description: "启动 dream-come-true 流水线。传入 theme(需求主题)、version(迭代版本号)、vault(Obsidian库名)。",
        args: {
          theme: tool.schema.string({ description: "需求主题描述，如 用户登录功能" }),
          version: tool.schema.string({ description: "迭代版本号，如 v1.0.0" }),
          vault: tool.schema.string({ description: "Obsidian 库名（用于自动打开笔记预览）" }),
        },
        async execute(args) {
          const rootDir = root()
          const stages = getStages(rootDir)
          currentVault = args.vault || ""

          const testAuthPath = join(rootDir, ".opencode", "skills", "test-auth", "SKILL.md")
          if (!existsSync(testAuthPath)) {
            return "dream-come-true 未初始化 ，运行 /captain_init 初始化插件环境"
          }

          const existing = await findKanbanFile(ctx.client.find.files.bind(ctx.client.find), prdDir())
          if (existing) {
            return `检测到已有 kanban.md：${existing}，执行断点续传。请调用 captain_next 继续。`
          }

          const { kanbanPath, kanbanDir } = createKanban(
            args.theme, args.version || "v1.0.0", args.vault || "", stages, rootDir,
          )
          return `已创建 PRD 看板：${kanbanPath}。请调用 captain_next 执行第一轮。`
        },
      }),

      captain_next: tool({
        description: "执行一轮阶段循环。读取 kanban.md 判断当前阶段，返回 action JSON。",
        args: {},
        async execute() {
          const rootDir = root()
          const stages = getStages(rootDir)

          let kanbanPath = await findKanbanFile(ctx.client.find.files.bind(ctx.client.find), prdDir())
          if (!kanbanPath) {
            // 尝试备用搜索
            kanbanPath = findKanbanFileRecursive(prdDir())
          }
          if (!kanbanPath) return "未找到 kanban.md，请先调用 captain_run。"

          const kanban = parseKanban(kanbanPath)

          function resolveAction(): string {
            const { index, stage, action } = findCurrentFromKanban(kanban, stages)
            if (!stage || index === null) return JSON.stringify({ action: "done", message: "全部完成！" })

            const stageKey = `阶段${stage.number}`
            const prdDirPath = dirname(kanbanPath)
            const prdDirName = dirname(kanbanPath).split(/[\\\/]/).pop() || ""

            switch (action) {
              case "sailor":
                return JSON.stringify({
                  action: "sailor", stepname: stage.name, stage: stageKey,
                  kanbanPath,
                  dispatch: {
                    stage_name: stage.name,
                    effort_level: stage.effort, prd_dir: prdDirName,
                    prev_artifacts: index > 0 ? stages[index - 1].artifacts : [],
                    current_artifacts: stage.artifacts,
                    stage_instruction: STAGE_INSTRUCTIONS[stageKey] || "",
                  },
                })

              case "parallel": {
                const planPath = join(rootDir, ".opencode", "run", "latest-execution-plan.json")
                if (existsSync(planPath)) {
                  const plan = JSON.parse(readFileSync(planPath, "utf-8"))
                  const wtProjects = kanban.meta.worktree?.projects || []
                  syncTasksFromPlan(kanban, plan, wtProjects)
                  saveKanban(kanbanPath, kanban, stages)

                  const projectMap = new Map(wtProjects.map(p => [p.project, p.worktreeDir]))
                  const resolvedTasks = (plan.tasks || []).map((t: any) => ({
                    ...t,
                    work_dir: t.work_dir || projectMap.get(t.project) || "",
                  }))

                  return JSON.stringify({
                    action: "execution_plan", stage: stageKey, stepname: stage.name,
                    prd_dir: prdDirName, kanbanPath,
                    plan_file: planPath, waves: plan.waves || [], tasks: resolvedTasks,
                  })
                }
                return JSON.stringify({
                  action: "sailor", stepname: stage.name, stage: stageKey,
                  no_status_update: true, kanbanPath,
                  dispatch: {
                    stage_name: stage.name,
                    effort_level: stage.effort, prd_dir: prdDirName,
                    prev_artifacts: index > 0 ? stages[index - 1].artifacts : [],
                    current_artifacts: stage.artifacts,
                    stage_instruction: STAGE_INSTRUCTIONS[stageKey] || "",
                  },
                })
              }

              case "inspector":
                return JSON.stringify({
                  action: "inspector", stepname: stage.name, stage: stageKey,
                  kanbanPath,
                  artifacts: stage.artifacts.map(a => `prd/${prdDirName}/${a}`),
                  checkpoint_path: `prd/${prdDirName}/checkpoint.md`,
                })

              case "confirm": {
                const ks = kanban.stages[stage.number - 1]
                if (ks?.autoPass) {
                  markKanbanColumn(kanban, stageKey, "userConfirm")
                  saveKanban(kanbanPath, kanban, stages)
                  return resolveAction()
                }

                if (stage.number === 2) {
                  const wc = getWorktreeFromKanban(kanban)
                  if (wc) {
                    const designPath = join(prdDirPath, "design.md")
                    const projects = extractProjectsFromDesign(designPath)
                    if (projects.length > 0) {
                      return JSON.stringify({
                        action: "confirm", stepname: stage.name, stage: stageKey,
                        kanbanPath,
                        on_pass: {
                          worktree: {
                            branch: kanban.meta.branch,
                            base_branch: "dev",
                            projects,
                            workspace_file: wc.workspaceFile,
                            worktree_base: wc.baseDir,
                          },
                        },
                      })
                    }
                  }
                }

                return JSON.stringify({ action: "confirm", stepname: stage.name, stage: stageKey, kanbanPath })
              }

              default:
                return JSON.stringify({ action: "done", message: "未知动作" })
            }
          }

          return resolveAction()
        },
      }),

      captain_schema: tool({
        description: "查询当前阶段的产物 Schema。返回 schema 文件内容。",
        args: { stage: tool.schema.number({ description: "阶段编号（1-6）" }) },
        async execute(args) {
          return resolveSchema(args.stage)
        },
      }),

      captain_mark: tool({
        description: "更新 kanban.md 中的阶段标记（产物/AI审查/用户确认）。",
        args: {
          kanbanPath: tool.schema.string({ description: "kanban.md 的完整路径" }),
          stage: tool.schema.string({ description: "阶段标识，如 阶段1" }),
          column: tool.schema.enum(["artifacts", "aiReview", "userConfirm"], {}),
        },
        async execute(args) {
          if (!fileExists(args.kanbanPath)) return "无法读取 kanban.md"
          const stages = getStages(root())
          const kanban = parseKanban(args.kanbanPath)
          markKanbanColumn(kanban, args.stage, args.column)
          saveKanban(args.kanbanPath, kanban, stages)

          if (args.column === "artifacts") {
            const match = args.stage.match(/阶段(\d+)/)
            if (match) {
              const num = parseInt(match[1], 10)
              const st = stages.find(s => s.number === num)
              if (st && st.artifacts.length > 0) {
                const prdDirName = dirname(args.kanbanPath).split(/[\\\/]/).pop() || ""
                const vault = kanban.meta.vault
                if (vault) {
                  const openCmds = st.artifacts.map(f =>
                    buildObsidianResult({ action: "open", vault, file: `prd/${prdDirName}/${f}` })
                  )
                  const kanbanCmd = buildObsidianResult({ action: "open", vault, file: `prd/${prdDirName}/kanban.md` })
                  return `已标记 ${args.stage} ${args.column} 完成。\n\n产物已生成，可执行以下命令在 Obsidian 预览：\n${openCmds.map(c => `  bash: ${JSON.parse(c).command}`).join("\n")}\n  bash: ${JSON.parse(kanbanCmd).command}`
                }
              }
            }
          }
          return `已标记 ${args.stage} ${args.column} 完成。`
        },
      }),

      captain_worktree: tool({
        description: "创建 worktree。阶段二确认后调用。如果成功，必须继续调用 captain_mark 和 captain_next，禁止停止。如果返回包含 'WORKTREE 创建失败'，必须停止流水线执行。",
        args: {
          kanbanPath: tool.schema.string({ description: "kanban.md 的完整路径" }),
        },
        async execute(args) {
          const result = setupWorktree(args.kanbanPath, root())
          const lines = [`共 ${result.projects.length} 个项目`]
          for (const p of result.projects) {
            lines.push(`  ${p.status === "成功" ? "✅" : p.status === "跳过" ? "⏭️" : "❌"} ${p.name}`)
            if (p.status === "成功") lines.push(`    worktree: ${p.worktreeDir}`)
          }
          if (result.errors.length) {
            lines.push("", "错误：")
            result.errors.forEach(e => lines.push(`  - ${e}`))
          }
          if (result.success) {
            lines.push("", `workspace: ${result.workspaceFile}`)
            lines.push("", "⚠️ worktree 创建成功。你必须立即执行以下步骤：")
            lines.push(`  1. 调用 captain_mark(kanbanPath: "${args.kanbanPath}", stage: "阶段2", column: "userConfirm")`)
            lines.push(`  2. 调用 captain_next() 继续流水线`)
            lines.push("禁止停止，禁止等待用户操作，禁止输出 git 提交指令。")
          } else {
            lines.unshift("⛔ WORKTREE 创建失败，流水线无法继续。")
            lines.push("", "请检查网络连接和 git 权限后重试。")
          }
          return lines.join("\n")
        },
      }),

      captain_status: tool({
        description: "查看当前流水线状态摘要。",
        args: {},
        async execute() {
          const rootDir = root()
          const stages = getStages(rootDir)

          let kanbanPath = await findKanbanFile(ctx.client.find.files.bind(ctx.client.find), prdDir())
          if (!kanbanPath) {
            // 尝试备用搜索
            kanbanPath = findKanbanFileRecursive(prdDir())
          }
          if (!kanbanPath) return "暂无进行中的流水线。"

          const kanban = parseKanban(kanbanPath)
          return getKanbanSummary(kanban, stages)
        },
      }),

      captain_task: tool({
        description: "更新 kanban 中任务的状态。用于阶段四 stevedore 执行前后更新任务泳道。",
        args: {
          kanbanPath: tool.schema.string({ description: "kanban.md 的完整路径" }),
          taskId: tool.schema.string({ description: "任务 ID，如 task-001" }),
          status: tool.schema.enum(["待开始", "进行中", "已完成"], {}),
        },
        async execute(args) {
          if (!fileExists(args.kanbanPath)) return "无法读取 kanban.md"
          const stages = getStages(root())
          const kanban = parseKanban(args.kanbanPath)
          const ok = updateKanbanTask(kanban, args.taskId, args.status as "待开始" | "进行中" | "已完成")
          if (!ok) return `未找到任务 ${args.taskId}`
          saveKanban(args.kanbanPath, kanban, stages)
          return `任务 ${args.taskId} → ${args.status}`
        },
      }),

      obsidian: tool({
        description: "在 Obsidian 中执行操作：打开笔记、新建笔记、打开日记、搜索、图谱、设置。返回 PowerShell 命令供 bash 执行。",
        args: {
          action: tool.schema.enum(["open", "new", "daily", "search", "graph", "settings", "advanced"], {}),
          vault: tool.schema.string({ description: "库名（除 settings 外必填）" }),
          file: tool.schema.string({ description: "文件路径（open/new 用）" }),
          name: tool.schema.string({ description: "笔记标题（new 用）" }),
          folder: tool.schema.string({ description: "目标文件夹（new 用）" }),
          content: tool.schema.string({ description: "笔记初始内容（new 用）" }),
          query: tool.schema.string({ description: "搜索关键词（search 用）" }),
          commandid: tool.schema.string({ description: "命令 ID（advanced 用）" }),
          heading: tool.schema.string({ description: "跳转标题（open 用）" }),
          blockId: tool.schema.string({ description: "跳转块 ID（open 用）" }),
        },
        async execute(args) {
          return buildObsidianResult({
            action: args.action as ObsidianAction,
            vault: args.vault,
            file: args.file,
            name: args.name,
            folder: args.folder,
            content: args.content,
            query: args.query,
            commandid: args.commandid,
            heading: args.heading,
            blockId: args.blockId,
          })
        },
      }),
    },
  }
}

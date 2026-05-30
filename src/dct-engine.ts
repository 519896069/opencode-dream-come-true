import { type Plugin, tool } from "@opencode-ai/plugin"
import { existsSync, readFileSync } from "fs"
import { join, dirname } from "path"
import { execSync } from "child_process"

import { getStages } from "./pipeline.js"
import {
  findKanbanFile, parseKanban, saveKanban, findCurrentFromKanban,
  createKanban, markKanbanColumn, getKanbanSummary, getWorktreeFromKanban,
  syncTasksFromPlan, updateKanbanTask,
} from "./kanban-manager.js"
import { extractProjectsFromDesign } from "./workspace-manager.js"
import { setupWorktree } from "./worktree-builder.js"
import { SKILL_CONTENT } from "./skills.js"
import { resolveSchema } from "./schema-resolver.js"
import { fileExists } from "./utils.js"
import { buildObsidianResult, type ObsidianAction } from "./obsidian-tool.js"

export const DreamComeTruePlugin: Plugin = async (ctx) => {
  const root = () => ctx.directory || process.cwd()
  const prdDir = () => join(root(), "prd")
  let currentVault = ""

  const loadPluginConfig = () => {
    const configPath = join(root(), "dream-come-true.json")
    if (existsSync(configPath)) {
      try {
        return JSON.parse(readFileSync(configPath, "utf-8"))
      } catch {
        return {}
      }
    }
    return {}
  }

  return {
    config: async (config) => {
      const pluginConfig = loadPluginConfig()
      if (pluginConfig.agents) {
        if (!config.agent) config.agent = {}
        Object.assign(config.agent, pluginConfig.agents)
      }
    },

    "tool.execute.after": async (input, output) => {
      if (input.tool !== "write") return
      const filePath = output.args?.filePath as string
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

          const kanbanPath = await findKanbanFile(ctx.client.find.files.bind(ctx.client.find), prdDir())
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
                    stage_skill: stage.skill, stage_name: stage.name,
                    effort_level: stage.effort, prd_dir: prdDirName,
                    prev_artifacts: index > 0 ? stages[index - 1].artifacts : [],
                    current_artifacts: stage.artifacts,
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
                    stage_skill: stage.skill, stage_name: stage.name,
                    effort_level: stage.effort, prd_dir: prdDirName,
                    prev_artifacts: index > 0 ? stages[index - 1].artifacts : [],
                    current_artifacts: stage.artifacts,
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
        description: "创建 worktree。阶段二确认后调用。读取 design.md 获取涉及项目，创建 git 分支和 worktree，生成 .code-workspace 文件。",
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
          if (result.success) lines.push("", `workspace: ${result.workspaceFile}`)
          return lines.join("\n")
        },
      }),

      captain_skill: tool({
        description: "获取阶段的完整执行指令。传入 skill 名称（如 dct-design），返回该阶段的完整 SKILL 内容。",
        args: {
          name: tool.schema.string({ description: "skill 名称，如 dct-normalization、dct-design、dct-planning、dct-execution、dct-review、dct-testing" }),
        },
        async execute(args) {
          const content = SKILL_CONTENT[args.name]
          if (!content) return `未找到 skill: ${args.name}`
          return content
        },
      }),

      captain_status: tool({
        description: "查看当前流水线状态摘要。",
        args: {},
        async execute() {
          const rootDir = root()
          const stages = getStages(rootDir)

          const kanbanPath = await findKanbanFile(ctx.client.find.files.bind(ctx.client.find), prdDir())
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

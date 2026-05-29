import { type Plugin, tool } from "@opencode-ai/plugin"
import { existsSync, readFileSync } from "fs"
import { join, dirname } from "path"

import { getStages } from "./pipeline.js"
import {
  findStatusFile, loadStatus, saveStatus, findCurrentStage,
  createStatus, markColumn, getStatusSummary, getWorktreeConfig,
} from "./status-manager.js"
import { extractProjectsFromDesign } from "./workspace-manager.js"
import { setupWorktree } from "./worktree-builder.js"
import { SKILL_CONTENT } from "./skills.js"
import { resolveSchema } from "./schema-resolver.js"
import { fileExists } from "./utils.js"

export const DreamComeTruePlugin: Plugin = async (ctx) => {
  const root = () => ctx.directory || process.cwd()
  const prdDir = () => join(root(), "prd")

  return {
    tool: {
      captain_run: tool({
        description: "启动 dream-come-true 流水线。传入 theme(需求主题)、version(迭代版本号)。",
        args: {
          theme: tool.schema.string({ description: "需求主题描述，如 用户登录功能" }),
          version: tool.schema.string({ description: "迭代版本号，如 v1.0.0" }),
        },
        async execute(args) {
          const rootDir = root()
          const stages = getStages(rootDir)

          const existing = await findStatusFile(ctx.client.find.files.bind(ctx.client.find), prdDir())
          if (existing) {
            return `检测到已有 status.json：${existing}，执行断点续传。请调用 captain_next 继续。`
          }

          const { statusPath, statusDir } = createStatus(
            args.theme, args.version || "v1.0.0", stages,
            args.projects || [], rootDir,
          )
          return `已创建 PRD：${dirname(statusPath)}。请调用 captain_next 执行第一轮。`
        },
      }),

      captain_next: tool({
        description: "执行一轮阶段循环。读取 status.json 判断当前阶段，返回 action JSON。",
        args: {},
        async execute() {
          const rootDir = root()
          const stages = getStages(rootDir)

          const statusFilePath = await findStatusFile(ctx.client.find.files.bind(ctx.client.find), prdDir())
          if (!statusFilePath) return "未找到 status.json，请先调用 captain_run。"

          const status = loadStatus(statusFilePath)

          function resolveAction(): string {
            const { index, stage, action } = findCurrentStage(status, stages)
            if (!stage || index === null) return JSON.stringify({ action: "done", message: "全部完成！" })

            const stageKey = `阶段${stage.number}`
            const prdDirPath = dirname(statusFilePath)
            const prdDirName = dirname(statusFilePath).split(/[\\\/]/).pop() || ""

            switch (action) {
              case "sailor":
                return JSON.stringify({
                  action: "sailor", stepname: stage.name, stage: stageKey,
                  statusPath: statusFilePath,
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
                  return JSON.stringify({
                    action: "execution_plan", stage: stageKey, stepname: stage.name,
                    prd_dir: prdDirName, statusPath: statusFilePath,
                    plan_file: planPath, waves: plan.waves || [], tasks: plan.tasks || [],
                  })
                }
                return JSON.stringify({
                  action: "sailor", stepname: stage.name, stage: stageKey,
                  no_status_update: true, statusPath: statusFilePath,
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
                  statusPath: statusFilePath,
                  artifacts: stage.artifacts.map(a => `prd/${prdDirName}/${a}`),
                  checkpoint_path: `prd/${prdDirName}/checkpoint.md`,
                })

              case "confirm": {
                const stageItem = status.stages[stage.number - 1]
                if (stageItem?.userConfirm.autoPass) {
                  markColumn(status, stageKey, "userConfirm")
                  saveStatus(statusFilePath, status)
                  return resolveAction()
                }

                if (stage.number === 2) {
                  const wc = getWorktreeConfig(status)
                  if (wc) {
                    const designPath = join(prdDirPath, "design.md")
                    const projects = extractProjectsFromDesign(designPath)
                    if (projects.length > 0) {
                      return JSON.stringify({
                        action: "confirm", stepname: stage.name, stage: stageKey,
                        statusPath: statusFilePath,
                        on_pass: {
                          worktree: {
                            branch: status.meta.branch,
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

                return JSON.stringify({ action: "confirm", stepname: stage.name, stage: stageKey, statusPath: statusFilePath })
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
        description: "更新 status.json 中的阶段标记（产物/AI审查/用户确认）。",
        args: {
          statusPath: tool.schema.string({}),
          stage: tool.schema.string({}),
          column: tool.schema.enum(["artifacts", "aiReview", "userConfirm"], {}),
        },
        async execute(args) {
          if (!fileExists(args.statusPath)) return "无法读取 status.json"
          const status = loadStatus(args.statusPath)
          markColumn(status, args.stage, args.column)
          saveStatus(args.statusPath, status)
          return `已标记 ${args.stage} ${args.column} 完成`
        },
      }),

      captain_worktree: tool({
        description: "创建 worktree。阶段二确认后调用。读取 design.md 获取涉及项目，创建 git 分支和 worktree，生成 .code-workspace 文件。",
        args: {
          statusPath: tool.schema.string({ description: "status.json 的完整路径" }),
        },
        async execute(args) {
          const result = setupWorktree(args.statusPath, root())
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

          const statusFilePath = await findStatusFile(ctx.client.find.files.bind(ctx.client.find), prdDir())
          if (!statusFilePath) return "暂无进行中的流水线。"

          const status = loadStatus(statusFilePath)
          return getStatusSummary(status, stages)
        },
      }),
    },
  }
}

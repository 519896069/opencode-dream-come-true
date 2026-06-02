import { tool } from "@opencode-ai/plugin"
import { existsSync } from "fs"
import { join } from "path"
import type { ToolContext } from "../core.ts"
import { getMilestones } from "../shared/pipeline.ts"
import { findStateFile, createKanban } from "../kanban-manager.ts"

export function createDctRun(ctx: ToolContext) {
  return tool({
    description: "启动 dream-come-true 流水线。传入 theme(需求主题)、version(迭代版本号)、vault(Obsidian库名)。",
    args: {
      theme: tool.schema.string({ description: "需求主题描述，如 用户登录功能" }),
      version: tool.schema.string({ description: "迭代版本号，如 v1.0.0" }),
      vault: tool.schema.string({ description: "Obsidian 库名（用于自动打开笔记预览）" }),
    },
    async execute(args) {
      const rootDir = ctx.root()
      const milestones = getMilestones()
      ctx.setCurrentVault(args.vault || "")

      const testAuthPath = join(rootDir, ".opencode", "skills", "test-auth", "SKILL.md")
      if (!existsSync(testAuthPath)) {
        return "dream-come-true 未初始化，运行 /dct_init 初始化插件环境"
      }

      const existing = await findStateFile(ctx.findFiles, ctx.prdDir())
      if (existing) {
        return `检测到已有状态文件: ${existing}，执行断点续传。请调用 dct_next 继续。`
      }

      const { statePath } = createKanban(
        args.theme, args.version || "v1.0.0", args.vault || "", milestones, rootDir,
      )
      return `已创建状态文件: ${statePath}。请调用 dct_next 执行第一轮。`
    },
  })
}

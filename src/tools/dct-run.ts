import { tool } from "@opencode-ai/plugin"
import type { ToolContext } from "../core.ts"
import { getMilestones } from "../shared/pipeline.ts"
import { createKanban } from "../kanban-manager.ts"

export function createDctRun(ctx: ToolContext) {
  return tool({
    description: "创建看板，启动流程。传入 theme(需求主题)、version(迭代版本号)、vault(Obsidian库名)。",
    args: {
      theme: tool.schema.string({ description: "需求主题描述，如 用户登录功能" }),
      version: tool.schema.string({ description: "迭代版本号，如 v1.0.0" }),
      vault: tool.schema.string({ description: "Obsidian 库名（用于自动打开笔记预览）" }),
    },
    async execute(args) {
      const rootDir = ctx.root()
      const milestones = getMilestones()
      ctx.setCurrentVault(args.vault || "")

      const { kanbanPath } = createKanban(
        args.theme, args.version || "v1.0.0", args.vault || "", milestones, rootDir,
      )
      return `已创建看板: ${kanbanPath}。请读取看板开始执行任务。`
    },
  })
}

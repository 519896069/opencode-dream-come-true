import { tool } from "@opencode-ai/plugin"
import type { ToolContext } from "../core.ts"
import { findStateFile, loadState, getKanbanSummary, findStateFileRecursive } from "../kanban-manager.ts"

export function createDctKanbanView(ctx: ToolContext) {
  return tool({
    description: "查看当前状态，精确到里程碑和产物文件。",
    args: {
      milestone: tool.schema.string({ description: "里程碑 ID（可选，如 M1）" }),
    },
    async execute(args) {
      let statePath = await findStateFile(ctx.findFiles, ctx.prdDir())
      if (!statePath) {
        statePath = findStateFileRecursive(ctx.prdDir())
      }
      if (!statePath) return "未找到 dct-state.json"

      const kanban = loadState(statePath)

      if (args.milestone) {
        const card = kanban.cards.find(c => c.id === args.milestone)
        if (!card) return `未找到里程碑 ${args.milestone}`
        const lines = [
          `## ${card.id}: ${card.name}`,
          `状态: ${card.status}`,
          "",
          "产物:",
        ]
        for (const art of card.artifacts) {
          if (art.status === "skipped") continue
          const icon = art.status === "done" ? "[x]" : art.status === "in_progress" ? "[/]" : "[ ]"
          lines.push(`  ${icon} ${art.file}`)
        }
        return lines.join("\n")
      }

      return getKanbanSummary(kanban)
    },
  })
}

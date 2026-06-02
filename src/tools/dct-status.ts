import { tool } from "@opencode-ai/plugin"
import type { ToolContext } from "../core.ts"
import { findStateFile, loadState, getKanbanSummary, findStateFileRecursive } from "../kanban-manager.ts"

export function createDctStatus(ctx: ToolContext) {
  return tool({
    description: "查看当前流水线状态摘要。",
    args: {},
    async execute() {
      let statePath = await findStateFile(ctx.findFiles, ctx.prdDir())
      if (!statePath) {
        statePath = findStateFileRecursive(ctx.prdDir())
      }
      if (!statePath) return "暂无进行中的流水线。"

      const kanban = loadState(statePath)
      return getKanbanSummary(kanban)
    },
  })
}

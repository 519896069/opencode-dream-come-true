import { tool } from "@opencode-ai/plugin"
import type { ToolContext } from "../core.ts"
import {
  findStateFile, loadState, saveState,
  updateCardStatus, updateArtifactStatus, enableOptionalArtifact,
  findStateFileRecursive,
} from "../kanban-manager.ts"

export function createDctKanbanUpdate(ctx: ToolContext) {
  return tool({
    description: "更新状态中的里程碑卡片状态或产物文件状态。每次调用后自动同步 kanban.md。",
    args: {
      cardId: tool.schema.string({ description: "里程碑 ID，如 M1" }),
      status: tool.schema.enum(["todo", "doing", "done", "blocked", "skipped"], { description: "卡片状态（可选）" }),
      artifact: tool.schema.string({ description: "产物文件名（可选，如 checkpoint.md）" }),
      artifactStatus: tool.schema.enum(["pending", "in_progress", "done", "skipped"], { description: "产物状态（可选）" }),
      enableArtifact: tool.schema.string({ description: "启用可选产物（如 preview.html）" }),
    },
    async execute(args) {
      let statePath = await findStateFile(ctx.findFiles, ctx.prdDir())
      if (!statePath) {
        statePath = findStateFileRecursive(ctx.prdDir())
      }
      if (!statePath) return "未找到 dct-state.json"

      const kanban = loadState(statePath)
      const results: string[] = []

      if (args.enableArtifact) {
        const ok = enableOptionalArtifact(kanban, args.cardId, args.enableArtifact)
        results.push(ok ? `已启用可选产物 ${args.enableArtifact}` : `未找到可选产物 ${args.enableArtifact}`)
      }

      if (args.status) {
        const ok = updateCardStatus(kanban, args.cardId, args.status as any)
        results.push(ok ? `卡片 ${args.cardId} → ${args.status}` : `未找到卡片 ${args.cardId}`)
      }

      if (args.artifact && args.artifactStatus) {
        const ok = updateArtifactStatus(kanban, args.cardId, args.artifact, args.artifactStatus as any)
        results.push(ok ? `产物 ${args.artifact} → ${args.artifactStatus}` : `未找到产物 ${args.artifact}`)
      }

      saveState(statePath, kanban)
      return results.join("\n") || "无更新"
    },
  })
}

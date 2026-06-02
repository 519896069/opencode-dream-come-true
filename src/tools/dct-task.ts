import { tool } from "@opencode-ai/plugin"
import { loadState, saveState, updateKanbanTask } from "../kanban-manager.ts"
import { fileExists } from "../shared/utils.ts"

export function createDctTask() {
  return tool({
    description: "更新 kanban 中任务的状态。",
    args: {
      kanbanPath: tool.schema.string({ description: ".dct-state.json 的完整路径" }),
      taskId: tool.schema.string({ description: "任务 ID，如 task-001" }),
      status: tool.schema.enum(["待开始", "进行中", "已完成"], {}),
    },
    async execute(args) {
      if (!fileExists(args.kanbanPath)) return "无法读取 dct-state.json"
      const kanban = loadState(args.kanbanPath)
      const ok = updateKanbanTask(kanban, args.taskId, args.status as "待开始" | "进行中" | "已完成")
      if (!ok) return `未找到任务 ${args.taskId}`
      saveState(args.kanbanPath, kanban)
      return `任务 ${args.taskId} → ${args.status}`
    },
  })
}

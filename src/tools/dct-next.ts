import { tool } from "@opencode-ai/plugin"
import { dirname } from "path"
import type { ToolContext } from "../core.ts"
import { getMilestones, getTaskTypes, getArtifactFile } from "../shared/pipeline.ts"
import { TASK_TEMPLATES } from "../templates/task-templates.ts"
import {
  findStateFile, loadState, saveState,
  getCurrentMilestone, updateCardStatus,
  findStateFileRecursive,
} from "../kanban-manager.ts"

export function createDctNext(ctx: ToolContext) {
  return tool({
    description: "执行一轮里程碑循环。读取 dct-state.json 判断当前状态，返回 action JSON。",
    args: {},
    async execute() {
      let statePath = await findStateFile(ctx.findFiles, ctx.prdDir())
      if (!statePath) {
        statePath = findStateFileRecursive(ctx.prdDir())
      }
      if (!statePath) return "未找到 dct-state.json，请先调用 dct_run。"

      const kanban = loadState(statePath)
      const { card, action } = getCurrentMilestone(kanban)

      if (action === "done") {
        return JSON.stringify({ action: "done", message: "全部完成！" })
      }

      if (!card) {
        return JSON.stringify({ action: "done", message: "无待处理里程碑" })
      }

      const prdDirName = dirname(statePath).split(/[\\\/]/).pop() || ""

      if (action === "confirm") {
        return JSON.stringify({
          action: "confirm",
          cardId: card.id,
          cardName: card.name,
          kanbanPath: statePath,
        })
      }

      if (card.status === "todo") {
        updateCardStatus(kanban, card.id, "doing")
        saveState(statePath, kanban)
      }

      const milestones = getMilestones()
      const milestone = milestones.find(m => m.id === card.milestone)
      if (!milestone) return JSON.stringify({ action: "done", message: `未找到里程碑定义 ${card.milestone}` })

      const doneArtifacts = kanban.cards.find(c => c.id === card.id)!.artifacts.filter(a => a.status === "done").map(a => a.file)
      const activeArtifacts = kanban.cards.find(c => c.id === card.id)!.artifacts.filter(a => a.status !== "skipped")
      const nextArtifact = activeArtifacts.find(a => a.status !== "done")

      if (!nextArtifact) {
        return JSON.stringify({
          action: "confirm",
          cardId: card.id,
          cardName: card.name,
          kanbanPath: statePath,
        })
      }

      const taskTypes = getTaskTypes()
      const sailorOutputs = taskTypes.flatMap(t => t.output)
      const captainGenerated = milestone.artifacts
        .map(a => getArtifactFile(a))
        .filter(f => !sailorOutputs.includes(f))

      if (captainGenerated.includes(nextArtifact.file)) {
        const needsExplore = nextArtifact.file === "design.md" && !doneArtifacts.includes("design.md")
        const exploreTemplate = TASK_TEMPLATES["explore_code"] || ""

        return JSON.stringify({
          action: "generate",
          cardId: card.id,
          cardName: card.name,
          kanbanPath: statePath,
          prd_dir: prdDirName,
          artifact: nextArtifact.file,
          needsExplore,
          dispatch: needsExplore ? {
            task_type: "explore_code",
            task_name: "代码探索",
            task_description: "探索代码库和数据库，返回汇总",
            input: ["checkpoint.md", "user-store.md"],
            output: [],
            task_template: exploreTemplate,
          } : undefined,
        })
      }

      const artifactTaskType = taskTypes.find(t => t.output.includes(nextArtifact.file))
      if (!artifactTaskType) {
        return JSON.stringify({ action: "done", message: `未知产物 ${nextArtifact.file}，无对应任务类型` })
      }

      const isOptional = kanban.cards.find(c => c.id === card.id)!.artifacts.find(a => a.file === nextArtifact.file)?.optional === true
      if (isOptional) {
        return JSON.stringify({
          action: "ask_preview",
          cardId: card.id,
          kanbanPath: statePath,
          prd_dir: prdDirName,
        })
      }

      const template = TASK_TEMPLATES[artifactTaskType.id] || ""
      return JSON.stringify({
        action: "task",
        cardId: card.id,
        cardName: card.name,
        kanbanPath: statePath,
        prd_dir: prdDirName,
        dispatch: {
          task_type: artifactTaskType.id,
          task_name: artifactTaskType.name,
          task_description: artifactTaskType.description,
          kanbanPath: statePath,
          input: artifactTaskType.input,
          output: artifactTaskType.output,
          task_template: template,
        },
      })
    },
  })
}

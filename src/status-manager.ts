import { join, dirname } from "path"
import type { Stage, StatusJson, StageItem, CurrentStageResult, MarkColumn, WorktreeEntry } from "./types.ts"
import { readJson, writeJson, fileExists, formatDate, slugify, generateBranch, ensureDir } from "./utils.ts"

export async function findStatusFile(findFilesFn: any, prdDir: string): Promise<string | null> {
  const result = await findFilesFn({ query: { query: "**/status.json", type: "file", directory: prdDir, limit: 5 } })
  return result.data?.length ? result.data[0] : null
}

export function loadStatus(statusPath: string): StatusJson {
  return readJson<StatusJson>(statusPath)
}

export function saveStatus(statusPath: string, data: StatusJson): void {
  data.meta.updatedAt = formatDate()
  writeJson(statusPath, data)
}

export function buildStagesFromConfig(stages: Stage[]): StageItem[] {
  return stages.map(s => ({
    number: s.number,
    name: s.name,
    artifacts: { done: false, files: s.artifacts },
    aiReview: { done: false },
    userConfirm: { done: false, autoPass: s.autoPass },
  }))
}

export function findCurrentStage(status: StatusJson, stages: Stage[]): CurrentStageResult {
  for (let i = 0; i < status.stages.length; i++) {
    const si = status.stages[i]
    if (si.userConfirm.done) continue

    const st = stages[i] || null
    if (!si.artifacts.done) return { index: i, stage: st, action: st?.parallel ? "parallel" : "sailor" }
    if (st?.aiReview && !si.aiReview.done) return { index: i, stage: st, action: "inspector" }
    return { index: i, stage: st, action: "confirm" }
  }
  return { index: null, stage: null, action: "done" }
}

export function createStatus(
  theme: string,
  version: string,
  stages: Stage[],
  projects: string[],
  rootDir: string,
): { statusPath: string; statusDir: string } {
  const dateStr = formatDate()
  const brief = slugify(theme)
  const branch = generateBranch(version, brief)
  const slug = `${version}_${brief}_fzp`
  const dirName = `${dateStr}-${slug}`
  const statusDir = join(rootDir, "prd", dirName)

  const worktreeBase = join(rootDir, "agent-workspace", "worktree", `dev_${version}`)
  const worktreeEntries: WorktreeEntry[] = projects.map(p => ({
    project: p,
    worktreeDir: join(worktreeBase, `feature_${brief}_fzp`, p.replace(/[/\\]/g, "_")),
    branch,
  }))

  const status: StatusJson = {
    meta: { theme, version, branch, createdAt: dateStr, updatedAt: dateStr },
    worktree: {
      baseDir: worktreeBase,
      workspaceFile: join(worktreeBase, `feature_${brief}_fzp.code-workspace`),
      projects: worktreeEntries,
    },
    stages: buildStagesFromConfig(stages),
  }

  const statusPath = join(statusDir, "status.json")
  ensureDir(statusDir)
  writeJson(statusPath, status)
  return { statusPath, statusDir }
}

export function markColumn(status: StatusJson, stageKey: string, column: MarkColumn): void {
  const idx = status.stages.findIndex(s => `阶段${s.number}` === stageKey || `阶段${s.number}：${s.name}` === stageKey)
  if (idx === -1) return

  if (column === "userConfirm") {
    status.stages[idx].userConfirm.done = true
  } else if (column === "artifacts") {
    status.stages[idx].artifacts.done = true
  } else if (column === "aiReview") {
    status.stages[idx].aiReview.done = true
  }
}

export function getStatusSummary(status: StatusJson, stages: Stage[]): string {
  const { stage, action } = findCurrentStage(status, stages)
  const lines = [
    `--- dream-come-true 状态 ---`,
    `需求：${status.meta.theme}`,
    `当前：${stage ? `阶段${stage.number}：${stage.name}` : "全部完成"}`,
    `下一步：${action}`,
    "",
  ]
  for (const s of status.stages) {
    const a = s.artifacts.done ? "[x]" : "[ ]"
    const r = s.aiReview.done ? "[x]" : "[ ]"
    const c = s.userConfirm.done ? "[✅]" : "[ ]"
    lines.push(`  阶段${s.number}：${s.name}  产物=${a}  审查=${r}  确认=${c}`)
  }
  return lines.join("\n")
}

export function getWorktreeConfig(status: StatusJson): StatusJson["worktree"] | null {
  return status.worktree || null
}

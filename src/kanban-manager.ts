import { join, dirname } from "path"
import { readFileSync, writeFileSync } from "fs"
import type {
  Stage, KanbanData, KanbanStage, KanbanTask, WorktreeEntry,
  CurrentStageResult, MarkColumn,
} from "./types.js"
import { formatDate, slugify, generateBranch, ensureDir } from "./utils.js"

const KANBAN_PLUGIN = "kanban-plugin: basic"
const DCT_RE = /<!--dct (.*?)-->/

export function createKanban(
  theme: string,
  version: string,
  vault: string,
  stages: Stage[],
  rootDir: string,
): { kanbanPath: string; kanbanDir: string } {
  const dateStr = formatDate()
  const brief = slugify(theme)
  const branch = generateBranch(version, brief)
  const slug = `${version}_${brief}_fzp`
  const dirName = `${dateStr}-${slug}`
  const kanbanDir = join(rootDir, "prd", dirName)
  const kanbanPath = join(kanbanDir, "kanban.md")

  const worktreeBase = join(rootDir, "agent-workspace", "worktree", `dev_${version}`)

  const data: KanbanData = {
    meta: {
      theme,
      version,
      branch,
      createdAt: dateStr,
      updatedAt: dateStr,
      vault,
      worktree: {
        baseDir: worktreeBase,
        workspaceFile: join(worktreeBase, `feature_${brief}_fzp.code-workspace`),
        projects: [],
      },
    },
    stages: stages.map(s => ({
      number: s.number,
      name: s.name,
      artifacts: false,
      aiReview: false,
      userConfirm: false,
      autoPass: s.autoPass,
    })),
    tasks: [],
  }

  ensureDir(kanbanDir)
  writeKanban(kanbanPath, data, stages)
  return { kanbanPath, kanbanDir }
}

export async function findKanbanFile(
  findFilesFn: any,
  prdDir: string,
): Promise<string | null> {
  const result = await findFilesFn({
    query: { query: "**/kanban.md", type: "file", directory: prdDir, limit: 5 },
  })
  return result.data?.length ? result.data[0] : null
}

export function parseKanban(kanbanPath: string): KanbanData {
  const content = readFileSync(kanbanPath, "utf-8")
  const match = content.match(DCT_RE)
  if (!match) throw new Error(`Failed to parse kanban: ${kanbanPath}`)
  return JSON.parse(match[1]) as KanbanData
}

export function saveKanban(kanbanPath: string, data: KanbanData, stages: Stage[]): void {
  data.meta.updatedAt = formatDate()
  writeKanban(kanbanPath, data, stages)
}

function writeKanban(kanbanPath: string, data: KanbanData, stages: Stage[]): void {
  const body = buildKanbanBody(data, stages)
  writeFileSync(kanbanPath, body, "utf-8")
}

function buildKanbanBody(data: KanbanData, stages: Stage[]): string {
  const dctJson = JSON.stringify(data)
  const lines: string[] = []

  lines.push("---")
  lines.push(KANBAN_PLUGIN)
  lines.push("---")
  lines.push("")
  lines.push(`<!--dct ${dctJson}-->`)
  lines.push("")

  for (const s of data.stages) {
    lines.push(`## 📋 阶段${s.number}：${s.name}`)
    lines.push("")

    const st = stages.find(x => x.number === s.number)
    const artifactFiles = st?.artifacts || []

    for (const f of artifactFiles) {
      const check = s.artifacts ? "x" : " "
      lines.push(`- [${check}] 产物：${f}`)
    }

    if (s.autoPass && s.number !== 4) {
      lines.push(`- [x] AI 审查（自动跳过）`)
      lines.push(`- [x] 用户确认（自动跳过）`)
    } else {
      const aCheck = s.aiReview ? "x" : " "
      const uCheck = s.userConfirm ? "x" : " "
      lines.push(`- [${aCheck}] AI 审查`)
      lines.push(`- [${uCheck}] 用户确认`)
    }
    lines.push("")
  }

  lines.push("## ⚡ 执行任务")
  lines.push("")
  const pending = data.tasks.filter(t => t.status === "待开始")
  const inProgress = data.tasks.filter(t => t.status === "进行中")
  const done = data.tasks.filter(t => t.status === "已完成")

  if (pending.length === 0 && inProgress.length === 0 && done.length === 0) {
    lines.push("暂无任务")
  }

  for (const t of pending) {
    const deps = t.dependsOn.length > 0 ? ` ^依赖：${t.dependsOn.join(", ")}` : ""
    lines.push(`- [ ] ${t.id}：${t.name}${deps}`)
    if (t.work_dir) lines.push(`  workdir: ${t.work_dir}`)
    if (t.contract) {
      for (const cl of t.contract.split("\n")) {
        lines.push(`  ${cl}`)
      }
    }
  }
  lines.push("")

  for (const t of inProgress) {
    lines.push(`- [ ] ${t.id}：${t.name}【进行中】`)
  }
  lines.push("")

  lines.push("## ✅ 任务完成")
  lines.push("")
  for (const t of done) {
    lines.push(`- [x] ${t.id}：${t.name}`)
  }
  lines.push("")

  return lines.join("\n")
}

export function findCurrentFromKanban(data: KanbanData, stages: Stage[]): CurrentStageResult {
  for (let i = 0; i < data.stages.length; i++) {
    const ks = data.stages[i]
    if (ks.userConfirm) continue

    const st = stages[i] || null
    if (!ks.artifacts) return { index: i, stage: st, action: st?.parallel ? "parallel" : "sailor" }
    if (st?.aiReview && !ks.aiReview) return { index: i, stage: st, action: "inspector" }
    return { index: i, stage: st, action: "confirm" }
  }
  return { index: null, stage: null, action: "done" }
}

export function markKanbanColumn(data: KanbanData, stageKey: string, column: MarkColumn): void {
  const match = stageKey.match(/阶段(\d+)/)
  if (!match) return
  const num = parseInt(match[1], 10)
  const idx = data.stages.findIndex(s => s.number === num)
  if (idx === -1) return

  if (column === "userConfirm") {
    data.stages[idx].userConfirm = true
  } else if (column === "artifacts") {
    data.stages[idx].artifacts = true
  } else if (column === "aiReview") {
    data.stages[idx].aiReview = true
  }
}

export function getKanbanSummary(data: KanbanData, stages: Stage[]): string {
  const { stage, action } = findCurrentFromKanban(data, stages)
  const lines = [
    "--- dream-come-true 状态 ---",
    `需求：${data.meta.theme}`,
    `当前：${stage ? `阶段${stage.number}：${stage.name}` : "全部完成"}`,
    `下一步：${action}`,
    "",
  ]
  for (const s of data.stages) {
    const a = s.artifacts ? "[x]" : "[ ]"
    const r = s.aiReview ? "[x]" : "[ ]"
    const c = s.userConfirm ? "[✅]" : "[ ]"
    lines.push(`  阶段${s.number}：${s.name}  产物=${a}  审查=${r}  确认=${c}`)
  }
  if (data.tasks.length > 0) {
    lines.push("")
    lines.push("任务：")
    for (const t of data.tasks) {
      lines.push(`  ${t.id}：${t.name} [${t.status}]`)
    }
  }
  return lines.join("\n")
}

export function syncTasksFromPlan(
  data: KanbanData,
  plan: { waves?: any[]; tasks?: any[] },
  worktreeProjects?: { project: string; worktreeDir: string }[],
): void {
  const tasks = plan.tasks || []
  const existingIds = new Set(data.tasks.map(t => t.id))
  const projectMap = new Map((worktreeProjects || []).map(p => [p.project, p.worktreeDir]))

  for (const pt of tasks) {
    if (existingIds.has(pt.id) && data.tasks.find(t => t.id === pt.id)) continue
    const workDir = pt.work_dir || projectMap.get(pt.project) || ""
    data.tasks.push({
      id: pt.id,
      name: pt.name || pt.agent_description || pt.id,
      status: "待开始",
      dependsOn: pt.dependsOn || pt.depends_on || [],
      contract: pt.prompt || pt.contract || "",
      wave: pt.wave,
      work_dir: workDir,
    })
  }
}

export function updateKanbanTask(data: KanbanData, taskId: string, newStatus: "待开始" | "进行中" | "已完成"): boolean {
  const task = data.tasks.find(t => t.id === taskId)
  if (!task) return false
  task.status = newStatus
  return true
}

export function getWorktreeFromKanban(data: KanbanData): NonNullable<KanbanData["meta"]["worktree"]> | null {
  return data.meta.worktree || null
}

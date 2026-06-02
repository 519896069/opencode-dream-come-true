import { join } from "path"
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs"
import type {
  Milestone, KanbanData,
  CardStatus, ArtifactStatus, CurrentMilestoneResult,
} from "./shared/types.ts"
import { formatDate, slugify, generateBranch, ensureDir } from "./shared/utils.ts"

// ─── 事件系统 ───────────────────────────────────────────────────────

type StateChangeCallback = (statePath: string, data: KanbanData) => void
const listeners: StateChangeCallback[] = []

export function onStateChange(callback: StateChangeCallback) {
  listeners.push(callback)
}

function emit(statePath: string, data: KanbanData) {
  for (const cb of listeners) cb(statePath, data)
}

// ─── 文件查找 ───────────────────────────────────────────────────────

export function findStateFileRecursive(dir: string): string | null {
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        const result = findStateFileRecursive(fullPath)
        if (result) return result
      } else if (entry === ".dct-state.json") {
        return fullPath
      }
    }
  } catch {
    // ignore
  }
  return null
}

export async function findStateFile(
  findFilesFn: any,
  prdDir: string,
): Promise<string | null> {
  try {
    return findStateFileRecursive(prdDir)
  } catch {
    return null
  }
}

// ─── 状态管理层 ─────────────────────────────────────────────────────

export function loadState(statePath: string): KanbanData {
  return JSON.parse(readFileSync(statePath, "utf-8")) as KanbanData
}

export function saveState(statePath: string, data: KanbanData): void {
  data.meta.updatedAt = formatDate()
  writeFileSync(statePath, JSON.stringify(data, null, 2), "utf-8")
  emit(statePath, data)
}

export function createKanban(
  theme: string,
  version: string,
  vault: string,
  milestones: Milestone[],
  rootDir: string,
): { statePath: string; kanbanPath: string; kanbanDir: string } {
  const dateStr = formatDate()
  const brief = slugify(theme)
  const branch = generateBranch(version, brief)
  const slug = `${version}_${brief}_fzp`
  const dirName = `${dateStr}-${slug}`
  const kanbanDir = join(rootDir, "prd", dirName)
  const statePath = join(kanbanDir, ".dct-state.json")
  const kanbanPath = join(kanbanDir, "kanban.md")

  const worktreeBase = join(rootDir, "worktree", `dev_${version}`)

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
    cards: milestones.map(m => ({
      id: m.id,
      milestone: m.id,
      name: m.name,
      status: "todo" as CardStatus,
      artifacts: m.artifacts.map(a => {
        const isOptional = typeof a === "object" && a.optional === true
        const file = typeof a === "string" ? a : a.file
        return {
          file,
          status: isOptional ? "skipped" as ArtifactStatus : "pending" as ArtifactStatus,
          optional: isOptional,
        }
      }),
    })),
    tasks: [],
  }

  ensureDir(kanbanDir)
  saveState(statePath, data)
  return { statePath, kanbanPath, kanbanDir }
}

export function getCurrentMilestone(data: KanbanData): CurrentMilestoneResult {
  for (const card of data.cards) {
    if (card.status === "done") continue
    if (card.status === "blocked") continue
    if (card.status === "skipped") continue

    if (card.status === "todo") {
      return { milestone: null, card, action: "task" }
    }

    if (card.status === "doing") {
      const activeArtifacts = card.artifacts.filter(a => a.status !== "skipped")
      const allDone = activeArtifacts.every(a => a.status === "done")
      if (allDone) {
        return { milestone: null, card, action: "confirm" }
      }
      return { milestone: null, card, action: "task" }
    }
  }

  return { milestone: null, card: null, action: "done" }
}

export function updateCardStatus(
  data: KanbanData,
  cardId: string,
  status: CardStatus,
): boolean {
  const card = data.cards.find(c => c.id === cardId)
  if (!card) return false
  card.status = status
  return true
}

export function updateArtifactStatus(
  data: KanbanData,
  cardId: string,
  file: string,
  status: ArtifactStatus,
): boolean {
  const card = data.cards.find(c => c.id === cardId)
  if (!card) return false
  const artifact = card.artifacts.find(a => a.file === file)
  if (!artifact) return false
  artifact.status = status
  return true
}

export function enableOptionalArtifact(data: KanbanData, cardId: string, file: string): boolean {
  const card = data.cards.find(c => c.id === cardId)
  if (!card) return false
  const artifact = card.artifacts.find(a => a.file === file)
  if (!artifact || !artifact.optional) return false
  artifact.status = "pending"
  return true
}

export function getKanbanSummary(data: KanbanData): string {
  const { card, action } = getCurrentMilestone(data)
  const lines = [
    "--- dream-come-true 状态 ---",
    `需求: ${data.meta.theme}`,
    `当前: ${card ? `${card.id}: ${card.name}` : "全部完成"}`,
    `下一步: ${action}`,
    "",
  ]

  for (const c of data.cards) {
    const statusIcon = c.status === "done" ? "[x]" : c.status === "doing" ? "[/]" : c.status === "blocked" ? "[!]" : c.status === "skipped" ? "[-]" : "[ ]"
    lines.push(`  ${statusIcon} ${c.id}: ${c.name}`)
    for (const art of c.artifacts) {
      if (art.status === "skipped") continue
      const artIcon = art.status === "done" ? "[x]" : "[ ]"
      lines.push(`    ${artIcon} ${art.file}`)
    }
  }

  if (data.tasks.length > 0) {
    lines.push("")
    lines.push("任务:")
    for (const t of data.tasks) {
      lines.push(`  ${t.id}: ${t.name} [${t.status}]`)
    }
  }

  return lines.join("\n")
}

export function updateKanbanTask(
  data: KanbanData,
  taskId: string,
  newStatus: "待开始" | "进行中" | "已完成",
): boolean {
  const task = data.tasks.find(t => t.id === taskId)
  if (!task) return false
  task.status = newStatus
  return true
}

// ─── 展示生成层 ─────────────────────────────────────────────────────

export function writeDisplay(kanbanPath: string, data: KanbanData): void {
  const lines: string[] = []

  lines.push("---")
  lines.push("kanban-plugin: basic")
  lines.push("---")
  lines.push("")

  const todoCards = data.cards.filter(c => c.status === "todo")
  const doingCards = data.cards.filter(c => c.status === "doing")
  const doneCards = data.cards.filter(c => c.status === "done")
  const blockedCards = data.cards.filter(c => c.status === "blocked")
  const skippedCards = data.cards.filter(c => c.status === "skipped")

  lines.push("## 待办")
  lines.push("")
  for (const card of todoCards) {
    lines.push(`- [ ] ${card.id}: ${card.name}`)
    for (const art of card.artifacts) {
      if (art.status === "skipped") continue
      lines.push(`  - [ ] 产物: ${art.file}`)
    }
  }
  lines.push("")

  lines.push("## 进行中")
  lines.push("")
  for (const card of doingCards) {
    lines.push(`- [/] ${card.id}: ${card.name}`)
    for (const art of card.artifacts) {
      if (art.status === "skipped") continue
      const check = art.status === "done" ? "x" : " "
      lines.push(`  - [${check}] 产物: ${art.file}`)
    }
  }
  lines.push("")

  lines.push("## 已完成")
  lines.push("")
  for (const card of doneCards) {
    lines.push(`- [x] ${card.id}: ${card.name}`)
    for (const art of card.artifacts) {
      lines.push(`  - [x] 产物: ${art.file}`)
    }
  }
  lines.push("")

  if (blockedCards.length > 0) {
    lines.push("## 已阻塞")
    lines.push("")
    for (const card of blockedCards) {
      lines.push(`- [!] ${card.id}: ${card.name}`)
      for (const art of card.artifacts) {
        const check = art.status === "done" ? "x" : art.status === "skipped" ? "~" : " "
        lines.push(`  - [${check}] 产物: ${art.file}`)
      }
    }
    lines.push("")
  }

  if (skippedCards.length > 0) {
    lines.push("## 已跳过")
    lines.push("")
    for (const card of skippedCards) {
      lines.push(`- [-] ${card.id}: ${card.name}`)
    }
    lines.push("")
  }

  if (data.tasks.length > 0) {
    lines.push("## 执行任务")
    lines.push("")
    const pending = data.tasks.filter(t => t.status === "待开始")
    const inProgress = data.tasks.filter(t => t.status === "进行中")
    const done = data.tasks.filter(t => t.status === "已完成")

    for (const t of pending) {
      const deps = t.dependsOn.length > 0 ? ` ^依赖: ${t.dependsOn.join(", ")}` : ""
      lines.push(`- [ ] ${t.id}: ${t.name}${deps}`)
    }
    for (const t of inProgress) {
      lines.push(`- [ ] ${t.id}: ${t.name} [进行中]`)
    }
    lines.push("")
    lines.push("## 任务完成")
    lines.push("")
    for (const t of done) {
      lines.push(`- [x] ${t.id}: ${t.name}`)
    }
    lines.push("")
  }

  writeFileSync(kanbanPath, lines.join("\n"), "utf-8")
}

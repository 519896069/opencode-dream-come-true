export interface Stage {
  number: number
  name: string
  artifacts: string[]
  effort: "low" | "medium" | "high" | "max"
  aiReview: boolean
  parallel: boolean
  autoPass: boolean
}

export interface WorktreeEntry {
  project: string
  worktreeDir: string
  branch: string
}

export interface StageItem {
  number: number
  name: string
  artifacts: { done: boolean; files: string[] }
  aiReview: { done: boolean }
  userConfirm: { done: boolean; autoPass: boolean }
}

export interface StatusJson {
  meta: {
    theme: string
    version: string
    branch: string
    createdAt: string
    updatedAt: string
  }
  worktree?: {
    baseDir: string
    workspaceFile: string
    projects: WorktreeEntry[]
  }
  stages: StageItem[]
}

export interface CurrentStageResult {
  index: number | null
  stage: Stage | null
  action: "sailor" | "parallel" | "inspector" | "confirm" | "done"
}

export type MarkColumn = "artifacts" | "aiReview" | "userConfirm"

export interface KanbanMeta {
  theme: string
  version: string
  branch: string
  createdAt: string
  updatedAt: string
  vault?: string
  worktree?: {
    baseDir: string
    workspaceFile: string
    projects: WorktreeEntry[]
  }
}

export interface KanbanStage {
  number: number
  name: string
  artifacts: boolean
  aiReview: boolean
  userConfirm: boolean
  autoPass: boolean
}

export interface KanbanTask {
  id: string
  name: string
  status: "待开始" | "进行中" | "已完成"
  dependsOn: string[]
  contract: string
  wave?: number
  work_dir?: string
}

export interface KanbanData {
  meta: KanbanMeta
  stages: KanbanStage[]
  tasks: KanbanTask[]
}

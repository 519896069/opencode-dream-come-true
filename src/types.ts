export interface Stage {
  number: number
  name: string
  skill: string
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

export interface MilestoneArtifact {
  file: string
  optional?: boolean
}

export interface Milestone {
  id: string
  name: string
  artifacts: (string | MilestoneArtifact)[]
  description: string
}

export interface TaskType {
  id: string
  name: string
  milestone: string
  description: string
  input: string[]
  output: string[]
}

export interface PipelineConfig {
  milestones: Milestone[]
  taskTypes: TaskType[]
}

export interface WorktreeEntry {
  project: string
  worktreeDir: string
  branch: string
}

export type CardStatus = "todo" | "doing" | "done" | "blocked" | "skipped"

export type ArtifactStatus = "pending" | "in_progress" | "done" | "skipped"

export interface KanbanArtifact {
  file: string
  status: ArtifactStatus
  optional?: boolean
}

export interface KanbanCard {
  id: string
  milestone: string
  name: string
  status: CardStatus
  artifacts: KanbanArtifact[]
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

export interface KanbanData {
  meta: KanbanMeta
  cards: KanbanCard[]
  tasks: KanbanTask[]
}

export interface CurrentMilestoneResult {
  milestone: Milestone | null
  card: KanbanCard | null
  action: "task" | "confirm" | "done"
  taskType?: TaskType
}

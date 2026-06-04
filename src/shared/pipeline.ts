import type { Milestone, MilestoneArtifact } from "./types.ts"

const BUILTIN_CONFIG: {
  milestones: Milestone[]
} = {
  milestones: [
    {
      id: "M1",
      name: "需求分析与设计",
      artifacts: [
        "checkpoint.md",
        "user-store.md",
        "design.md",
        "api.json",
        "test-case.md",
        { file: "preview.html", optional: true },
      ],
      description: "从需求输入到设计完成，包含需求澄清、代码分析、设计决策、产物生成",
    },
    {
      id: "M2",
      name: "任务拆分",
      artifacts: ["tasks.md", "tasks/*.md"],
      description: "将设计文档拆分为可执行的原子任务，生成任务路由文件和独立任务文件",
    },
    {
      id: "M3",
      name: "编码任务",
      artifacts: ["代码文件"],
      description: "按照 tasks.md 的执行顺序，逐轮派发编码任务给 Executor 执行",
    },
  ],
}

export function getArtifactFile(artifact: string | MilestoneArtifact): string {
  return typeof artifact === "string" ? artifact : artifact.file
}

export function isArtifactOptional(artifact: string | MilestoneArtifact): boolean {
  return typeof artifact === "object" && artifact.optional === true
}

export function getArtifactFiles(artifacts: (string | MilestoneArtifact)[]): string[] {
  return artifacts.map(getArtifactFile)
}

export function getMilestones(): Milestone[] {
  return BUILTIN_CONFIG.milestones
}

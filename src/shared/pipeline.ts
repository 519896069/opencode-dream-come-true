import type { PipelineConfig, Milestone, MilestoneArtifact, TaskType } from "./types.ts"

const BUILTIN_CONFIG: PipelineConfig = {
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
      artifacts: ["plan.md"],
      description: "将设计文档拆分为可执行的原子任务，每个API端点一个Task",
    },
  ],
  taskTypes: [
    {
      id: "explore_code",
      name: "代码探索",
      milestone: "M1",
      description: "探索代码库、查数据库，返回汇总给 Captain 做设计决策",
      input: ["checkpoint.md", "user-store.md"],
      output: [],
    },
    {
      id: "generate_preview",
      name: "生成预览",
      milestone: "M1",
      description: "生成可运行的React/Vue组件原型",
      input: ["design.md"],
      output: ["preview.html"],
    },
    {
      id: "split_tasks",
      name: "任务拆分",
      milestone: "M2",
      description: "将设计文档拆分为原子任务",
      input: ["design.md", "api.json"],
      output: ["plan.md"],
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

export function getTaskTypes(): TaskType[] {
  return BUILTIN_CONFIG.taskTypes
}

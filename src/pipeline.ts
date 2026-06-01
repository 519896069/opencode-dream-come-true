import { existsSync, readFileSync } from "fs"
import { join } from "path"
import type { Stage } from "./types.ts"

const BUILTIN_STAGES: Stage[] = [
  { number: 1, name: "需求澄清", artifacts: ["requirement.md", "fields.md", "checkpoint.md", "boundary.md"], effort: "high", aiReview: false, parallel: false, autoPass: false },
  { number: 2, name: "方案设计", artifacts: ["design-analysis.md", "design.md", "api.json", "test-case.md", "workspace.code-workspace"], effort: "max", aiReview: true, parallel: false, autoPass: false },
  { number: 3, name: "原子拆分", artifacts: ["plan.md"], effort: "max", aiReview: true, parallel: false, autoPass: false },
  { number: 4, name: "TDD执行", artifacts: [], effort: "medium", aiReview: true, parallel: true, autoPass: true },
  { number: 5, name: "代码审查", artifacts: ["review-log.md"], effort: "high", aiReview: false, parallel: false, autoPass: true },
  { number: 6, name: "集成测试+E2E", artifacts: ["test-report.md"], effort: "high", aiReview: false, parallel: false, autoPass: false },
]

const PIPELINE_CONFIG_FILE = "pipeline.config.json"

export function getStages(rootDir: string): Stage[] {
  const configPath = join(rootDir, PIPELINE_CONFIG_FILE)
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, "utf-8")
      const config = JSON.parse(raw)
      if (config.stages && Array.isArray(config.stages)) {
        return config.stages as Stage[]
      }
    } catch {
      // fall through to builtin
    }
  }
  return BUILTIN_STAGES
}

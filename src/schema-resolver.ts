import { SCHEMA_CONTENT } from "./schemas.ts"

const SCHEMA_MAP: Record<number, string[]> = {
  1: ["normalization.md"],
  2: ["design.md", "api.json.md"],
  3: ["planning.md"],
  4: ["execution.md"],
  5: ["review.md"],
  6: ["test-report-template.md"],
}

export function resolveSchema(stageNumber: number): string {
  const files = SCHEMA_MAP[stageNumber] || []
  if (!files.length) return `未找到阶段${stageNumber}的 schema 文件`
  return files.map(f => `## ${f}\n\n${SCHEMA_CONTENT[f] || ""}`).join("\n\n---\n\n")
}

import { existsSync, readFileSync } from "fs"

export function extractProjectsFromDesign(designPath: string): string[] {
  if (!existsSync(designPath)) return []
  const content = readFileSync(designPath, "utf-8")
  const projectSection = content.match(/## 涉及项目\s*\n([\s\S]*?)(?=\n## |$)/)?.[1] || ""
  return projectSection.split("\n")
    .map(line => line.replace(/^[-*]\s*/, "").trim())
    .filter(line => line && line !== "无")
}

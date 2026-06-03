import { join } from "path"
import { writeFileSync, mkdirSync } from "fs"
import type { Milestone } from "./shared/types.ts"
import { formatDate, slugify } from "./shared/utils.ts"

function ensureDir(dir: string) {
  try {
    mkdirSync(dir, { recursive: true })
  } catch {}
}

// 创建看板目录和 kanban.md 文件
export function createKanban(
  theme: string,
  version: string,
  vault: string,
  milestones: Milestone[],
  rootDir: string,
): { kanbanPath: string; kanbanDir: string } {
  const dateStr = formatDate()
  const brief = slugify(theme)
  const slug = `${version}_${brief}_fzp`
  const dirName = `${dateStr}-${slug}`
  const kanbanDir = join(rootDir, "prd", dirName)
  const kanbanPath = join(kanbanDir, "kanban.md")

  ensureDir(kanbanDir)

  // 生成 kanban.md 内容（简洁，只包含状态）
  const lines: string[] = []
  lines.push("---")
  lines.push("kanban-plugin: basic")
  lines.push("---")
  lines.push("")
  lines.push(`# ${theme}`)
  lines.push("")

  // 里程碑
  lines.push("## 待办里程碑")
  lines.push("")
  for (const m of milestones) {
    lines.push(`- [ ] ${m.id}: ${m.name} [type: ${m.id.toLowerCase()}]`)
  }
  lines.push("")
  lines.push("## 进行中的里程碑")
  lines.push("")
  lines.push("## 已完成里程碑")
  lines.push("")
  lines.push("## 编码任务")
  lines.push("")
  lines.push("## 进行中")
  lines.push("")
  lines.push("## 已完成")
  lines.push("")

  writeFileSync(kanbanPath, lines.join("\n"), "utf-8")
  return { kanbanPath, kanbanDir }
}

import { readFileSync } from "fs"
import { join } from "path"

const SCHEMAS_DIR = join(import.meta.dirname, "..", "schemas")

function loadSchema(name: string): string {
  try {
    return readFileSync(join(SCHEMAS_DIR, `${name}.md`), "utf-8")
  } catch {
    return `未找到 schema: ${name}`
  }
}

// 懒加载缓存
const cache: Record<string, string> = {}

export function resolveSchema(name: string): string {
  if (!cache[name]) {
    cache[name] = loadSchema(name)
  }
  return cache[name]
}

// 导出 schema 名称列表
export const SCHEMA_NAMES = [
  "checkpoint",
  "user-store",
  "design",
  "api.json",
  "tasks.md",
  "m1",
  "m2",
  "m3",
]

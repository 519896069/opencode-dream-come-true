import { readFileSync } from "fs"
import { join } from "path"

const CONTEXTS_DIR = join(import.meta.dirname, "..", "contexts")

function loadContext(name: string): string {
  try {
    return readFileSync(join(CONTEXTS_DIR, `${name}.md`), "utf-8")
  } catch {
    return `未找到上下文模板: ${name}`
  }
}

// 懒加载缓存
const cache: Record<string, string> = {}

export function resolveContext(name: string): string {
  if (!cache[name]) {
    cache[name] = loadContext(name)
  }
  return cache[name]
}

// 导出上下文名称列表
export const CONTEXT_NAMES = [
  "m1",
  "m2",
  "m3",
  "code-task",
]

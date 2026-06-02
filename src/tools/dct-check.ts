import { tool } from "@opencode-ai/plugin"
import { existsSync } from "fs"
import { join } from "path"
import type { ToolContext } from "../core.ts"

export function createDctCheck(ctx: ToolContext) {
  return tool({
    description: "检查插件环境是否初始化。",
    args: {},
    async execute() {
      const testAuthPath = join(ctx.root(), ".opencode", "skills", "test-auth", "SKILL.md")
      if (existsSync(testAuthPath)) {
        return "环境已初始化"
      }
      return "环境未初始化"
    },
  })
}

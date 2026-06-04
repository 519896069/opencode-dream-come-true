import { tool } from "@opencode-ai/plugin"
import { readFileSync, existsSync } from "fs"
import { join } from "path"
import type { ToolContext } from "../core.ts"
import { resolveContext } from "../shared/contexts.ts"

export function createDctTaskContext(ctx: ToolContext) {
  return tool({
    description: "获取任务上下文。支持两种调用方式：1) 获取上下文模板：dct_task_context(taskType: \"m1\") 2) 获取真实任务文件：dct_task_context(taskFile: \"tasks/T-001.md\")",
    args: {
      taskType: tool.schema.string({ 
        description: "任务类型，可选值：m1, m2, m3（获取模板时使用）" 
      }),
      taskFile: tool.schema.string({ 
        description: "任务文件位置，如 tasks/T-001.md（获取真实任务文件时使用）" 
      }),
    },
    async execute(args) {
      const prdDir = ctx.prdDir()
      
      // 如果传入 taskFile，读取文件内容返回
      if (args.taskFile) {
        const filePath = join(prdDir, args.taskFile)
        if (!existsSync(filePath)) {
          return `未找到任务文件: ${args.taskFile}`
        }
        return readFileSync(filePath, "utf-8")
      }
      
      // 否则，从 contexts/ 目录读取模板返回
      if (args.taskType) {
        return resolveContext(args.taskType)
      }
      
      return "请传入 taskType 或 taskFile 参数"
    },
  })
}

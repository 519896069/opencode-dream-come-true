import { tool } from "@opencode-ai/plugin"
import { buildObsidianResult, type ObsidianAction } from "../obsidian-tool.ts"

export function createObsidianTool() {
  return tool({
    description: "在 Obsidian 中执行操作：打开笔记、新建笔记、搜索等。",
    args: {
      action: tool.schema.enum(["open", "new", "daily", "search", "graph", "settings", "advanced"], {}),
      vault: tool.schema.string({ description: "库名" }),
      file: tool.schema.string({ description: "文件路径（open/new 用）" }),
      name: tool.schema.string({ description: "笔记标题（new 用）" }),
      folder: tool.schema.string({ description: "目标文件夹（new 用）" }),
      content: tool.schema.string({ description: "笔记初始内容（new 用）" }),
      query: tool.schema.string({ description: "搜索关键词（search 用）" }),
      commandid: tool.schema.string({ description: "命令 ID（advanced 用）" }),
      heading: tool.schema.string({ description: "跳转标题（open 用）" }),
      blockId: tool.schema.string({ description: "跳转块 ID（open 用）" }),
    },
    async execute(args) {
      return buildObsidianResult({
        action: args.action as ObsidianAction,
        vault: args.vault,
        file: args.file,
        name: args.name,
        folder: args.folder,
        content: args.content,
        query: args.query,
        commandid: args.commandid,
        heading: args.heading,
        blockId: args.blockId,
      })
    },
  })
}

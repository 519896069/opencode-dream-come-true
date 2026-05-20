import { type Plugin, tool } from "@opencode-ai/plugin"
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { homedir } from "os"

const PIPELINE_CONFIG = "pipeline.config.json"
const EXECUTION_PLAN_PATH = ".opencode/run/latest-execution-plan.json"

interface Stage {
  number: number
  name: string
  skill: string
  artifacts: string[]
  effort: "high" | "max" | "medium"
  aiReview: boolean | "skip"
  parallel: boolean
}

interface PipelineConfig { stages: Stage[] }

const DEFAULT_STAGES: Stage[] = [
  { number: 1, name: "需求澄清", skill: "dct-normalization", artifacts: ["requirement.md", "fields.md", "checkpoint.md", "boundary.md"], effort: "high", aiReview: "skip", parallel: false },
  { number: 2, name: "方案设计", skill: "dct-design", artifacts: ["design-analysis.md", "design.md", "api.json", "test-case.md"], effort: "max", aiReview: true, parallel: false },
  { number: 3, name: "原子拆分", skill: "dct-planning", artifacts: ["plan.md"], effort: "max", aiReview: true, parallel: false },
  { number: 4, name: "TDD执行", skill: "dct-execution", artifacts: [], effort: "medium", aiReview: true, parallel: true },
  { number: 5, name: "代码审查", skill: "dct-review", artifacts: ["review-log.md"], effort: "high", aiReview: true, parallel: false },
  { number: 6, name: "集成测试+E2E", skill: "dct-testing", artifacts: ["test-report.md"], effort: "high", aiReview: "skip", parallel: false },
]

function resolvePipelineConfig(projectRoot: string): string {
  const candidate = join(projectRoot, PIPELINE_CONFIG)
  if (existsSync(candidate)) return candidate
  return candidate
}

function loadStages(projectRoot: string): Stage[] {
  const configPath = resolvePipelineConfig(projectRoot)
  if (existsSync(configPath)) {
    const config: PipelineConfig = JSON.parse(readFileSync(configPath, "utf-8"))
    if (config.stages?.length) return config.stages
  }
  const configDir = join(
    process.platform === "win32"
      ? join(homedir(), "AppData", "Roaming", "opencode")
      : join(homedir(), ".config", "opencode"),
    PIPELINE_CONFIG
  )
  if (existsSync(configDir)) {
    const config: PipelineConfig = JSON.parse(readFileSync(configDir, "utf-8"))
    if (config.stages?.length) return config.stages
  }
  return DEFAULT_STAGES
}

function findCurrentStage(status: { stages: { stage: string; artifacts: string; aiReview: string; userConfirm: string }[] }, stages: Stage[]) {
  for (let i = 0; i < status.stages.length; i++) {
    if (status.stages[i].userConfirm !== "[✅]") {
      const st = stages[i] || null
      const artifactsDone = status.stages[i].artifacts === "[x]"
      const reviewDone = st?.aiReview !== true || status.stages[i].aiReview === "[x]"
      if (!artifactsDone) return { index: i, stage: st, action: st?.parallel ? "parallel" : "sailor" }
      if (!reviewDone) return { index: i, stage: st, action: "inspector" }
      return { index: i, stage: st, action: "confirm" }
    }
  }
  return { index: null, stage: null, action: "done" }
}

export const DreamComeTruePlugin: Plugin = async (ctx) => {
  const root = () => ctx.directory || process.cwd()
  const getStages = () => loadStages(root())
  const prdDir = () => join(root(), "prd")

  return {
    tool: {
      captain_run: tool({
        description: "启动 dream-come-true 流水线。根据需求主题创建 status.md 并初始化。",
        args: {
          theme: tool.schema.string({ description: "需求主题描述" }),
          mode: tool.schema.enum(["deep", "fast"], { description: "深度模式需要用户确认，快速模式自动决策" }),
        },
        async execute(args) {
          const stages = getStages()
          const filesResult = await ctx.client.find.files({ query: { query: "**/status.md", type: "file", directory: prdDir(), limit: 5 } })
          if (filesResult.data?.length) {
            return `检测到已有 status.md：${filesResult.data[0]}，执行断点续传。请调用 captain_next 继续。`
          }
          const dateStr = new Date().toISOString().slice(0, 10)
          const slug = args.theme.toLowerCase().replace(/[^\x00-\x7F]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "new-requirement"
          const dirName = `${dateStr}-${slug}`
          const fullPrdDir = join(prdDir(), dirName)
          mkdirSync(fullPrdDir, { recursive: true })
          const statusPath = join(fullPrdDir, "status.md")
          const stageRows = stages.map(s => {
            const aiReview = s.aiReview === true ? "[ ]" : "-"
            return `| 阶段${s.number}：${s.name} | [ ] | ${aiReview} | [ ] |`
          }).join("\n")
          const content = [
            `# ${args.theme} - 状态追踪`,
            `> 创建时间：${dateStr}`, `> 最后更新：${dateStr}`,
            ``, `## 需求配置`, `| 配置项 | 值 |`, `|--------|-----|`,
            `| 迭代版本 | v1.0.0 |`, `| 需求分支 | feature/${slug} |`,
            `| worktree 目录 | worktree/dev_v1.0.0/feature-${slug}/ |`,
            ``, `## 阶段进度`, `| 阶段 | 产物 | AI审查 | 用户确认 |`, `|------|------|--------|----------|`, stageRows,
            ``, `## 产物索引`, `| 阶段 | 产物文件 |`, `|------|----------|`, ...stages.map(s => `| 阶段${s.number} | |`),
          ].join("\n")
          writeFileSync(statusPath, content, "utf-8")
          return `已创建 PRD：${dirName}。请调用 captain_next 执行第一轮。`
        },
      }),

      captain_next: tool({
        description: "执行一轮阶段循环。读取 status.md 和 pipeline.config.json，返回 action JSON。",
        args: { mode: tool.schema.enum(["deep", "fast"], { description: "执行模式" }) },
        async execute(args) {
          const mode = args.mode || "deep"
          const stages = getStages()
          const filesResult = await ctx.client.find.files({ query: { query: "**/status.md", type: "file", directory: prdDir(), limit: 5 } })
          if (!filesResult.data?.length) return "未找到 status.md，请先调用 captain_run。"
          const statusPath = filesResult.data[0]
          const readResult = await ctx.client.file.read?.({ path: statusPath })
          const content = readResult?.data?.content || ""
          const stageLines = content.split("\n").filter(l => l.startsWith("| 阶段") && l.includes("："))
          const status = {
            stages: stageLines.map(l => { const p = l.split("|").map(s => s.trim()); return { stage: p[1] || "", artifacts: p[2] || "[ ]", aiReview: p[3] || "[ ]", userConfirm: p[4] || "[ ]" } }),
          }
          const { index, stage, action } = findCurrentStage(status, stages)
          if (!stage || index === null) return JSON.stringify({ action: "done", message: "全部完成！" })
          const stageKey = `阶段${stage.number}`
          const prdDirName = dirname(statusPath).split(/[\\\/]/).pop() || ""

          switch (action) {
            case "sailor":
              return JSON.stringify({ action: "sailor", stepname: stage.name, stage: stageKey, dispatch: { stage_skill: stage.skill, stage_name: stage.name, effort_level: stage.effort, prd_dir: prdDirName, prev_artifacts: index > 0 ? stages[index - 1].artifacts : [], current_artifacts: stage.artifacts } })
            case "parallel": {
              const planPath = join(root(), EXECUTION_PLAN_PATH)
              if (existsSync(planPath)) {
                const plan = JSON.parse(readFileSync(planPath, "utf-8"))
                return JSON.stringify({ action: "execution_plan", stage: stageKey, stepname: stage.name, prd_dir: prdDirName, statusPath, plan_file: planPath, waves: plan.waves || [], tasks: plan.tasks || [] })
              }
              return JSON.stringify({ action: "sailor", stepname: stage.name, stage: stageKey, no_status_update: true, dispatch: { stage_skill: stage.skill, stage_name: stage.name, effort_level: stage.effort, prd_dir: prdDirName, prev_artifacts: index > 0 ? stages[index - 1].artifacts : [], current_artifacts: stage.artifacts } })
            }
            case "inspector":
              return JSON.stringify({ action: "inspector", stepname: stage.name, stage: stageKey, artifacts: stage.artifacts.map(a => `prd/${prdDirName}/${a}`), checkpoint_path: `prd/${prdDirName}/checkpoint.md` })
            case "confirm":
              if (mode === "fast") return JSON.stringify({ action: "mark_pass", stepname: stage.name, stage: stageKey, statusPath })
              return JSON.stringify({ action: "confirm", stepname: stage.name, stage: stageKey, statusPath })
          }
        },
      }),

      captain_schema: tool({
        description: "查询当前阶段的产物 Schema。返回 schema 文件内容。",
        args: { stage: tool.schema.number({ description: "阶段编号（1-6）" }) },
        execute(args) {
          const map: Record<number, string[]> = {
            1: ["normalization.md"],
            2: ["design.md", "api.json.md"],
            3: ["planning.md"],
            4: ["execution.md"],
            5: ["review.md"],
            6: ["test-report-template.md"],
          }
          const files = map[args.stage] || []
          const schemas: string[] = []
          for (const f of files) {
            const candidates = [
              join(root(), ".opencode", "skills", "dct-schema", "schema", f),
              join(root(), ".opencode", "skills", "dct-testing", "reference", f),
              join(homedir(), ".config", "opencode", "skills", "dct-schema", "schema", f),
              join(homedir(), ".config", "opencode", "skills", "dct-testing", "reference", f),
              join(process.platform === "win32" ? join(homedir(), "AppData", "Roaming") : join(homedir(), ".config"), "opencode", "skills", "dct-schema", "schema", f),
            ]
            for (const p of candidates) {
              if (existsSync(p)) {
                schemas.push(`## ${f}\n\n${readFileSync(p, "utf-8")}`)
                break
              }
            }
          }
          return schemas.join("\n\n---\n\n") || `未找到阶段${args.stage}的 schema 文件`
        },
      }),

      captain_mark: tool({
        description: "更新 status.md 中的阶段标记（产物/AI审查/用户确认）。",
        args: { statusPath: tool.schema.string({}), stage: tool.schema.string({}), column: tool.schema.enum(["artifacts", "aiReview", "userConfirm"], {}) },
        async execute(args) {
          const readResult = await ctx.client.file.read?.({ path: args.statusPath })
          if (!readResult?.data?.content) return "无法读取 status.md"
          const lines = readResult.data.content.split("\n")
          const idx = lines.findIndex(l => l.startsWith(`| ${args.stage}`))
          if (idx === -1) return `未找到阶段行：${args.stage}`
          const line = lines[idx]
          if (args.column === "userConfirm") lines[idx] = line.replace(/\[(✅| |x)\]/, "[✅]")
          else if (args.column === "artifacts") lines[idx] = line.replace("[ ]", "[x]")
          else lines[idx] = line.replace("[ ]", "[x]")
          await ctx.client.file.write?.({ path: args.statusPath, content: lines.join("\n") })
          return `已标记 ${args.stage} ${args.column} 完成`
        },
      }),

      captain_status: tool({
        description: "查看当前流水线状态摘要。",
        args: {},
        async execute() {
          const stages = getStages()
          const filesResult = await ctx.client.find.files({ query: { query: "**/status.md", type: "file", directory: prdDir(), limit: 5 } })
          if (!filesResult.data?.length) return "暂无进行中的流水线。"
          const readResult = await ctx.client.file.read?.({ path: filesResult.data[0] })
          const content = readResult?.data?.content || ""
          const theme = content.match(/# (.+?) - 状态追踪/)?.[1] || ""
          const stageLines = content.split("\n").filter(l => l.startsWith("| 阶段") && l.includes("："))
          const status = { stages: stageLines.map(l => { const p = l.split("|").map(s => s.trim()); return { stage: p[1] || "", artifacts: p[2] || "[ ]", aiReview: p[3] || "[ ]", userConfirm: p[4] || "[ ]" } }) }
          const { stage, action } = findCurrentStage(status, stages)
          return [
            `--- dream-come-true 状态 ---`, `需求：${theme}`,
            `当前：${stage ? `阶段${stage.number}：${stage.name}` : "全部完成"}`, `下一步：${action}`,
            "", ...status.stages.map(s => `  ${s.stage}  产物=${s.artifacts}  审查=${s.aiReview}  确认=${s.userConfirm}`),
          ].join("\n")
        },
      }),
    },
  }
}

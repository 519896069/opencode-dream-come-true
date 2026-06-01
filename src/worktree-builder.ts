import { execSync } from "child_process"
import { existsSync, mkdirSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import type { WorktreeEntry } from "./types.ts"
import { parseKanban, saveKanban } from "./kanban-manager.ts"
import { getStages } from "./pipeline.ts"
import { extractProjectsFromDesign } from "./workspace-manager.ts"

export interface WorktreeResult {
  success: boolean
  projects: { name: string; worktreeDir: string; status: string }[]
  workspaceFile: string
  errors: string[]
}

export function setupWorktree(kanbanPath: string, rootDir: string): WorktreeResult {
  const kanbanDir = dirname(kanbanPath)
  const designPath = join(kanbanDir, "design.md")

  const projects = extractProjectsFromDesign(designPath)
  if (projects.length === 0) {
    return { success: false, projects: [], workspaceFile: "", errors: ["design.md 未找到涉及项目"] }
  }

  const kanban = parseKanban(kanbanPath)
  const stages = getStages(rootDir)

  const wc = kanban.meta.worktree
  if (!wc) {
    return { success: false, projects: [], workspaceFile: "", errors: ["kanban.md 缺少 worktree 配置"] }
  }

  const branch = kanban.meta.branch
  const brief = extractBrief(branch)
  const baseBranch = "dev"

  const results: WorktreeResult["projects"] = []
  const errors: string[] = []

  for (const project of projects) {
    const projectDir = join(rootDir, project)
    const wtDir = join(wc.baseDir, `feature_${brief}_fzp`, project.replace(/[/\\]/g, "_"))

    try {
      if (!existsSync(projectDir)) {
        errors.push(`${project}: 目录不存在 ${projectDir}`)
        results.push({ name: project, worktreeDir: wtDir, status: "跳过" })
        continue
      }

      runGit(projectDir, ["checkout", baseBranch])
      try { runGit(projectDir, ["pull"]) } catch { /* 无可拉取内容，忽略 */ }

      try {
        runGit(projectDir, ["checkout", "-b", branch, baseBranch])
      } catch {
        runGit(projectDir, ["checkout", branch])
      }

      try { runGit(projectDir, ["push", "origin", branch]) } catch { /* 已推送，忽略 */ }

      const parentDir = dirname(wtDir)
      if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true })

      runGit(projectDir, ["worktree", "add", wtDir, branch])

      results.push({ name: project, worktreeDir: wtDir, status: "成功" })
    } catch (e: any) {
      const msg = e.stderr?.toString() || e.stderr || e.message || String(e)
      errors.push(`${project}: ${msg}`)
      results.push({ name: project, worktreeDir: wtDir, status: "失败" })
    }
  }

  const successfulProjects = results.filter(r => r.status === "成功")
  const allFailed = successfulProjects.length === 0

  kanban.meta.worktree!.projects = successfulProjects.map(r => ({
    project: r.name,
    worktreeDir: r.worktreeDir,
    branch,
  }))
  saveKanban(kanbanPath, kanban, stages)

  if (allFailed) {
    return {
      success: false,
      projects: results,
      workspaceFile: "",
      errors: [...errors, "所有项目 worktree 创建失败，无法继续执行"],
    }
  }

  const workspacePath = wc.workspaceFile
  const wsDir = dirname(workspacePath)
  if (!existsSync(wsDir)) mkdirSync(wsDir, { recursive: true })

  writeFileSync(workspacePath, JSON.stringify({
    folders: successfulProjects.map(r => ({
      name: r.name,
      path: r.worktreeDir,
    })),
    settings: {},
  }, null, 2) + "\n", "utf-8")

  let editorLaunched = false
  try { execSync(`code-insiders "${workspacePath}"`, { stdio: "pipe" }); editorLaunched = true } catch { /* 未安装 code-insiders */ }
  if (!editorLaunched) {
    try { execSync(`code "${workspacePath}"`, { stdio: "pipe" }) } catch { /* 也未安装 code */ }
  }

  return {
    success: true,
    projects: results,
    workspaceFile: workspacePath,
    errors,
  }
}

function runGit(cwd: string, args: string[]): string {
  return execSync(`git ${args.join(" ")}`, { cwd, stdio: "pipe", encoding: "utf-8" }).trim()
}

function extractBrief(branch: string): string {
  const m = branch.match(/feature_(.+?)_fzp/)
  return m?.[1] || "new"
}

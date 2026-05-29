import { execSync } from "child_process"
import { existsSync, mkdirSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import type { StatusJson, WorktreeEntry } from "./types.js"
import { loadStatus, saveStatus } from "./status-manager.js"
import { extractProjectsFromDesign } from "./workspace-manager.js"

export interface WorktreeResult {
  success: boolean
  projects: { name: string; worktreeDir: string; status: string }[]
  workspaceFile: string
  errors: string[]
}

export function setupWorktree(statusPath: string, rootDir: string): WorktreeResult {
  const status = loadStatus(statusPath)
  const prdDir = dirname(statusPath)
  const designPath = join(prdDir, "design.md")

  const projects = extractProjectsFromDesign(designPath)
  if (projects.length === 0) {
    return { success: false, projects: [], workspaceFile: "", errors: ["design.md 未找到涉及项目"] }
  }

  const wc = status.worktree
  if (!wc) {
    return { success: false, projects: [], workspaceFile: "", errors: ["status.json 缺少 worktree 配置"] }
  }

  const { branch, version } = status.meta
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

  const workspacePath = wc.workspaceFile
  const wsDir = dirname(workspacePath)
  if (!existsSync(wsDir)) mkdirSync(wsDir, { recursive: true })

  writeFileSync(workspacePath, JSON.stringify({
    folders: results.filter(r => r.status === "成功").map(r => ({
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

  status.worktree!.projects = results.filter(r => r.status === "成功").map(r => ({
    project: r.name,
    worktreeDir: r.worktreeDir,
    branch,
  }))
  saveStatus(statusPath, status)

  return {
    success: results.some(r => r.status === "成功"),
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

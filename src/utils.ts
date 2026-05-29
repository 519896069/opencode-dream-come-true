import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"

export function readFile(path: string): string {
  return readFileSync(path, "utf-8")
}

export function writeFile(path: string, content: string): void {
  writeFileSync(path, content, "utf-8")
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T
}

export function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8")
}

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true })
}

export function fileExists(path: string): boolean {
  return existsSync(path)
}

export function extractTheme(content: string): string {
  return content.match(/# (.+?) - 状态追踪/)?.[1] || ""
}

export function slugify(text: string): string {
  const words = text.match(/[a-zA-Z0-9\u4e00-\u9fff]+/g) || []
  return words.slice(0, 3).join("-")
}

export function formatDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function generateBranch(version: string, brief: string): string {
  return `dev_${version}/feature_${brief}_fzp`
}

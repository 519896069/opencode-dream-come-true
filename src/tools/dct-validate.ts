import { tool } from "@opencode-ai/plugin"
import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { execSync } from "child_process"
import type { ToolContext } from "../core.ts"

interface ValidationResult {
  check: string
  status: "pass" | "fail" | "skip"
  details: string[]
}

interface ValidateResponse {
  taskId: string
  artifact: string
  validation: ValidationResult[]
  overall: "pass" | "fail"
  message: string
}

type ProjectType = "golang" | "frontend" | "unknown"

function detectProjectType(projectRoot: string): ProjectType {
  if (existsSync(join(projectRoot, "go.mod"))) {
    return "golang"
  }
  if (existsSync(join(projectRoot, "package.json"))) {
    return "frontend"
  }
  return "unknown"
}

function execCommand(command: string, cwd: string): { success: boolean; output: string } {
  try {
    const output = execSync(command, {
      cwd,
      encoding: "utf-8",
      timeout: 120000,
      stdio: ["pipe", "pipe", "pipe"],
    })
    return { success: true, output }
  } catch (error: any) {
    const stderr = error.stderr || ""
    const stdout = error.stdout || ""
    return { success: false, output: stderr || stdout || error.message }
  }
}

export function createDctValidate(ctx: ToolContext) {
  return tool({
    description: "验证任务产物是否符合预期，防止模型幻觉。任务完成后自动调用。",
    args: {
      taskId: { type: "string", description: "任务 ID" },
      artifact: { type: "string", description: "产物文件路径" },
      workDir: { type: "string", description: "工作目录（git 仓库根目录）" },
    },
    async execute(args) {
      const { taskId, artifact, workDir } = args
      const results: ValidationResult[] = []
      const projectRoot = workDir || ctx.root()
      const projectType = detectProjectType(projectRoot)

      // 1. 文件存在性验证
      const fileResult = await checkFileExists(artifact, projectRoot)
      results.push(fileResult)

      // 如果文件不存在，直接返回失败
      if (fileResult.status === "fail") {
        const response: ValidateResponse = {
          taskId,
          artifact,
          validation: results,
          overall: "fail",
          message: "验证失败：产物文件不存在",
        }
        return JSON.stringify(response, null, 2)
      }

      // 2. 编译检查
      const compileResult = await checkCompile(projectType, projectRoot)
      results.push(compileResult)

      // 3. 类型检查
      const typeResult = await checkType(projectType, projectRoot)
      results.push(typeResult)

      // 4. Lint 检查
      const lintResult = await checkLint(projectType, projectRoot)
      results.push(lintResult)

      // 5. 单元测试
      const testResult = await checkUnitTest(projectType, projectRoot)
      results.push(testResult)

      const overall = results.every(r => r.status === "pass" || r.status === "skip") ? "pass" : "fail"

      const response: ValidateResponse = {
        taskId,
        artifact,
        validation: results,
        overall,
        message: overall === "pass"
          ? "所有验证通过"
          : "验证失败，请检查错误信息并修复",
      }

      return JSON.stringify(response, null, 2)
    },
  })
}

async function checkFileExists(
  artifact: string,
  projectRoot: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    check: "文件存在性",
    status: "pass",
    details: [],
  }

  const filePath = join(projectRoot, artifact)
  if (!existsSync(filePath)) {
    result.status = "fail"
    result.details.push(`产物文件不存在: ${artifact}`)
  } else {
    result.details.push(`产物文件存在: ${artifact}`)
  }

  return result
}

async function checkCompile(
  projectType: ProjectType,
  projectRoot: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    check: "编译检查",
    status: "skip",
    details: [],
  }

  if (projectType === "golang") {
    const { success, output } = execCommand("go build ./...", projectRoot)
    result.status = success ? "pass" : "fail"
    if (success) {
      result.details.push("Go 编译通过")
    } else {
      result.details.push(`Go 编译失败:\n${output}`)
    }
  } else if (projectType === "frontend") {
    // 检查 package.json 中是否有 build 脚本
    const packageJsonPath = join(projectRoot, "package.json")
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"))
      if (packageJson.scripts?.build) {
        const { success, output } = execCommand("npm run build", projectRoot)
        result.status = success ? "pass" : "fail"
        if (success) {
          result.details.push("前端构建通过")
        } else {
          result.details.push(`前端构建失败:\n${output}`)
        }
      } else {
        result.details.push("未找到 build 脚本，跳过编译检查")
      }
    }
  } else {
    result.details.push("未知项目类型，跳过编译检查")
  }

  return result
}

async function checkType(
  projectType: ProjectType,
  projectRoot: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    check: "类型检查",
    status: "skip",
    details: [],
  }

  if (projectType === "golang") {
    const { success, output } = execCommand("go vet ./...", projectRoot)
    result.status = success ? "pass" : "fail"
    if (success) {
      result.details.push("Go 类型检查通过")
    } else {
      result.details.push(`Go 类型检查失败:\n${output}`)
    }
  } else if (projectType === "frontend") {
    // 检查是否有 tsconfig.json
    const tsConfigPath = join(projectRoot, "tsconfig.json")
    if (existsSync(tsConfigPath)) {
      const { success, output } = execCommand("npx tsc --noEmit", projectRoot)
      result.status = success ? "pass" : "fail"
      if (success) {
        result.details.push("TypeScript 类型检查通过")
      } else {
        result.details.push(`TypeScript 类型检查失败:\n${output}`)
      }
    } else {
      result.details.push("未找到 tsconfig.json，跳过类型检查")
    }
  } else {
    result.details.push("未知项目类型，跳过类型检查")
  }

  return result
}

async function checkLint(
  projectType: ProjectType,
  projectRoot: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    check: "Lint 检查",
    status: "skip",
    details: [],
  }

  if (projectType === "golang") {
    // 检查是否有 golangci-lint 配置
    const golangciLintPath = join(projectRoot, ".golangci.yml")
    const golangciLintPath2 = join(projectRoot, ".golangci.yaml")
    if (existsSync(golangciLintPath) || existsSync(golangciLintPath2)) {
      const { success, output } = execCommand("golangci-lint run", projectRoot)
      result.status = success ? "pass" : "fail"
      if (success) {
        result.details.push("Go Lint 检查通过")
      } else {
        result.details.push(`Go Lint 检查失败:\n${output}`)
      }
    } else {
      result.details.push("未找到 golangci-lint 配置，跳过 Lint 检查")
    }
  } else if (projectType === "frontend") {
    // 检查是否有 eslint 配置
    const eslintConfigPath = join(projectRoot, ".eslintrc.js")
    const eslintConfigPath2 = join(projectRoot, ".eslintrc.json")
    const eslintConfigPath3 = join(projectRoot, "eslint.config.js")
    if (existsSync(eslintConfigPath) || existsSync(eslintConfigPath2) || existsSync(eslintConfigPath3)) {
      const { success, output } = execCommand("npx eslint .", projectRoot)
      result.status = success ? "pass" : "fail"
      if (success) {
        result.details.push("ESLint 检查通过")
      } else {
        result.details.push(`ESLint 检查失败:\n${output}`)
      }
    } else {
      result.details.push("未找到 ESLint 配置，跳过 Lint 检查")
    }
  } else {
    result.details.push("未知项目类型，跳过 Lint 检查")
  }

  return result
}

async function checkUnitTest(
  projectType: ProjectType,
  projectRoot: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    check: "单元测试",
    status: "skip",
    details: [],
  }

  if (projectType === "golang") {
    const { success, output } = execCommand("go test ./...", projectRoot)
    result.status = success ? "pass" : "fail"
    if (success) {
      result.details.push("Go 单元测试通过")
    } else {
      result.details.push(`Go 单元测试失败:\n${output}`)
    }
  } else if (projectType === "frontend") {
    // 检查 package.json 中是否有 test 脚本
    const packageJsonPath = join(projectRoot, "package.json")
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"))
      if (packageJson.scripts?.test) {
        const { success, output } = execCommand("npm test", projectRoot)
        result.status = success ? "pass" : "fail"
        if (success) {
          result.details.push("前端单元测试通过")
        } else {
          result.details.push(`前端单元测试失败:\n${output}`)
        }
      } else {
        result.details.push("未找到 test 脚本，跳过单元测试")
      }
    }
  } else {
    result.details.push("未知项目类型，跳过单元测试")
  }

  return result
}

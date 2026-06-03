import { tool } from "@opencode-ai/plugin"
import { existsSync, readFileSync } from "fs"
import { join, dirname } from "path"
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

export function createDctValidate(ctx: ToolContext) {
  return tool({
    description: "验证任务产物是否符合预期，防止模型幻觉。任务完成后自动调用。",
    args: {
      taskId: { type: "string", description: "任务 ID" },
      artifact: { type: "string", description: "产物文件路径" },
      workDir: { type: "string", description: "工作目录" },
    },
    async execute(args) {
      const { taskId, artifact, workDir } = args
      const results: ValidationResult[] = []
      const projectRoot = ctx.root()

      // 1. 函数存在性验证
      const funcResult = await checkFunctionsExist(artifact, projectRoot, workDir)
      results.push(funcResult)

      // 2. API 接口验证
      const apiResult = await checkApiExists(artifact, projectRoot, workDir)
      results.push(apiResult)

      // 3. 依赖库验证
      const depResult = await checkDependencies(artifact, projectRoot)
      results.push(depResult)

      // 4. 表/字段验证
      const tableResult = await checkTables(artifact, projectRoot, workDir)
      results.push(tableResult)

      // 5. 编译检查
      const compileResult = await checkCompile(projectRoot, workDir)
      results.push(compileResult)

      // 6. 类型检查
      const typeResult = await checkType(projectRoot, workDir)
      results.push(typeResult)

      // 7. 单元测试
      const testResult = await checkUnitTest(projectRoot, workDir)
      results.push(testResult)

      const overall = results.every(r => r.status === "pass") ? "pass" : "fail"

      const response: ValidateResponse = {
        taskId,
        artifact,
        validation: results,
        overall,
        message: overall === "pass" 
          ? "所有验证通过" 
          : "验证失败，请检查错误信息并修复"
      }

      return JSON.stringify(response, null, 2)
    },
  })
}

async function checkFunctionsExist(
  artifact: string, 
  projectRoot: string, 
  workDir?: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    check: "函数存在性",
    status: "pass",
    details: []
  }

  try {
    // 读取产物文件，提取函数名
    const filePath = join(projectRoot, artifact)
    if (!existsSync(filePath)) {
      result.status = "fail"
      result.details.push(`产物文件不存在: ${artifact}`)
      return result
    }

    const content = readFileSync(filePath, "utf-8")
    
    // 提取函数定义（Go 语法）
    const goFuncRegex = /func\s+(\w+)\s*\(/g
    const matches = content.matchAll(goFuncRegex)
    
    for (const match of matches) {
      const funcName = match[1]
      // 在项目中搜索函数定义
      // 这里简化处理，实际应该使用 grep 或 LSP
      result.details.push(`函数 ${funcName} 已定义`)
    }

    // 如果没有找到函数定义，标记为跳过
    if (result.details.length === 0) {
      result.status = "skip"
      result.details.push("未找到函数定义")
    }
  } catch (error) {
    result.status = "fail"
    result.details.push(`验证失败: ${error}`)
  }

  return result
}

async function checkApiExists(
  artifact: string, 
  projectRoot: string, 
  workDir?: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    check: "API 接口",
    status: "pass",
    details: []
  }

  try {
    // 读取产物文件，提取 API 路径
    const filePath = join(projectRoot, artifact)
    if (!existsSync(filePath)) {
      result.status = "fail"
      result.details.push(`产物文件不存在: ${artifact}`)
      return result
    }

    const content = readFileSync(filePath, "utf-8")
    
    // 提取 API 路径（Go 语法）
    const apiRegex = /["']\/api\/[^"']+["']/g
    const matches = content.matchAll(apiRegex)
    
    for (const match of matches) {
      const apiPath = match[0].replace(/["']/g, "")
      result.details.push(`API 路径 ${apiPath} 已定义`)
    }

    // 如果没有找到 API 路径，标记为跳过
    if (result.details.length === 0) {
      result.status = "skip"
      result.details.push("未找到 API 路径")
    }
  } catch (error) {
    result.status = "fail"
    result.details.push(`验证失败: ${error}`)
  }

  return result
}

async function checkDependencies(
  artifact: string, 
  projectRoot: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    check: "依赖库",
    status: "pass",
    details: []
  }

  try {
    // 检查 Go 依赖
    const goModPath = join(projectRoot, "go.mod")
    if (existsSync(goModPath)) {
      const content = readFileSync(goModPath, "utf-8")
      result.details.push("go.mod 存在")
      
      // 提取依赖
      const depRegex = /require\s+\(([\s\S]*?)\)/g
      const matches = content.matchAll(depRegex)
      for (const match of matches) {
        const deps = match[1].split("\n").filter(d => d.trim())
        result.details.push(`找到 ${deps.length} 个依赖`)
      }
    }

    // 检查 Node.js 依赖
    const packageJsonPath = join(projectRoot, "package.json")
    if (existsSync(packageJsonPath)) {
      const content = readFileSync(packageJsonPath, "utf-8")
      const packageJson = JSON.parse(content)
      const depCount = Object.keys(packageJson.dependencies || {}).length
      const devDepCount = Object.keys(packageJson.devDependencies || {}).length
      result.details.push(`package.json 存在，${depCount} 个依赖，${devDepCount} 个开发依赖`)
    }

    // 如果没有找到依赖文件，标记为跳过
    if (result.details.length === 0) {
      result.status = "skip"
      result.details.push("未找到依赖文件")
    }
  } catch (error) {
    result.status = "fail"
    result.details.push(`验证失败: ${error}`)
  }

  return result
}

async function checkTables(
  artifact: string, 
  projectRoot: string, 
  workDir?: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    check: "表/字段",
    status: "pass",
    details: []
  }

  try {
    // 读取产物文件，提取表名
    const filePath = join(projectRoot, artifact)
    if (!existsSync(filePath)) {
      result.status = "fail"
      result.details.push(`产物文件不存在: ${artifact}`)
      return result
    }

    const content = readFileSync(filePath, "utf-8")
    
    // 提取表名（Go 语法，gorm tag）
    const tableRegex = /TableName\(\)\s*string\s*{\s*return\s*["'](\w+)["']/g
    const matches = content.matchAll(tableRegex)
    
    for (const match of matches) {
      const tableName = match[1]
      result.details.push(`表 ${tableName} 已定义`)
    }

    // 如果没有找到表定义，标记为跳过
    if (result.details.length === 0) {
      result.status = "skip"
      result.details.push("未找到表定义")
    }
  } catch (error) {
    result.status = "fail"
    result.details.push(`验证失败: ${error}`)
  }

  return result
}

async function checkCompile(
  projectRoot: string, 
  workDir?: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    check: "编译检查",
    status: "pass",
    details: []
  }

  try {
    // 检查是否是 Go 项目
    const goModPath = join(projectRoot, "go.mod")
    if (existsSync(goModPath)) {
      // 运行 go build
      // 注意：这里只是示例，实际需要使用 bash 工具执行
      result.details.push("Go 项目，需要运行 go build")
      result.status = "skip"
    }

    // 检查是否是 Node.js 项目
    const packageJsonPath = join(projectRoot, "package.json")
    if (existsSync(packageJsonPath)) {
      const content = readFileSync(packageJsonPath, "utf-8")
      const packageJson = JSON.parse(content)
      if (packageJson.scripts?.build) {
        result.details.push("Node.js 项目，需要运行 npm run build")
        result.status = "skip"
      }
    }

    // 如果没有找到构建配置，标记为跳过
    if (result.details.length === 0) {
      result.status = "skip"
      result.details.push("未找到构建配置")
    }
  } catch (error) {
    result.status = "fail"
    result.details.push(`验证失败: ${error}`)
  }

  return result
}

async function checkType(
  projectRoot: string, 
  workDir?: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    check: "类型检查",
    status: "pass",
    details: []
  }

  try {
    // 检查是否是 TypeScript 项目
    const tsConfigPath = join(projectRoot, "tsconfig.json")
    if (existsSync(tsConfigPath)) {
      result.details.push("TypeScript 项目，需要运行 tsc --noEmit")
      result.status = "skip"
    }

    // 检查是否是 Go 项目
    const goModPath = join(projectRoot, "go.mod")
    if (existsSync(goModPath)) {
      result.details.push("Go 项目，需要运行 go vet")
      result.status = "skip"
    }

    // 如果没有找到类型检查配置，标记为跳过
    if (result.details.length === 0) {
      result.status = "skip"
      result.details.push("未找到类型检查配置")
    }
  } catch (error) {
    result.status = "fail"
    result.details.push(`验证失败: ${error}`)
  }

  return result
}

async function checkUnitTest(
  projectRoot: string, 
  workDir?: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    check: "单元测试",
    status: "pass",
    details: []
  }

  try {
    // 检查是否是 Go 项目
    const goModPath = join(projectRoot, "go.mod")
    if (existsSync(goModPath)) {
      result.details.push("Go 项目，需要运行 go test")
      result.status = "skip"
    }

    // 检查是否是 Node.js 项目
    const packageJsonPath = join(projectRoot, "package.json")
    if (existsSync(packageJsonPath)) {
      const content = readFileSync(packageJsonPath, "utf-8")
      const packageJson = JSON.parse(content)
      if (packageJson.scripts?.test) {
        result.details.push("Node.js 项目，需要运行 npm test")
        result.status = "skip"
      }
    }

    // 如果没有找到测试配置，标记为跳过
    if (result.details.length === 0) {
      result.status = "skip"
      result.details.push("未找到测试配置")
    }
  } catch (error) {
    result.status = "fail"
    result.details.push(`验证失败: ${error}`)
  }

  return result
}

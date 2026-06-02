export const SCHEMA_CHECKPOINT = `# checkpoint.md 模板

## 功能概述
{一段话精确描述这个需求要做什么}

## 功能范围
### 包含
- 功能点1
### 不包含
- 明确不做的事情1

## 外部依赖
| 模块 | 依赖内容 | 接口 |
|------|----------|------|
| 用户体系 | 复用登录态、用户ID | GetCurrentUser |

## 字段定义
| 字段名 | 类型 | 长度 | 必填 | 默认值 | 说明 | 校验规则 |
|--------|------|------|:--:|--------|------|----------|
| id | bigint | - | 是 | 自增 | 主键 | - |
| name | string | 50 | 是 | - | 名称 | 1-50字符，非空 |

## 验收条件
### 正常流程
- [ ] 验收点: {可测试的行为描述}
### 异常流程
- [ ] 验收点: 必填为空提示、不存在返回404
### 边界条件
- [ ] 验收点: 超长截断、并发处理

## 边界条件与约束
### 业务流程
### 权限定义
| 角色 | 可执行操作 | 数据范围 |
|------|------------|----------|
| 管理员 | 增删改查 | 全部 |
| 普通用户 | 查 | 自己的 |

### 数据量级
| 维度 | 预估 |
|------|------|
| 数据总量 | 万级 |
| 单页数量 | 20 |

### 非功能需求
| 维度 | 要求 |
|------|------|
| 响应时间 | < 200ms |
| 安全 | 需登录校验 |
`

export const SCHEMA_USER_STORE = `# user-store.md 模板

## 用户故事
作为{角色}，我想要{功能}，以便{价值}

## 操作流程
| 步骤 | 操作 | 系统响应 | 页面 |
|------|------|----------|------|
| 1 | 打开页面 | 显示列表 | 用户列表页 |
| 2 | 点击新增 | 弹出表单 | 新增弹窗 |

## 页面清单
| 页面 | 路由 | 组件 | 说明 |
|------|------|------|------|
| 用户列表 | /users | UserList | 主页面 |
`

export const SCHEMA_DESIGN = `# design.md 模板

## 一、数据库变更分析
### 1.1 现有表字段变更
| 表名 | 需新增字段 | 需修改字段 | 说明 |
|------|------------|------------|------|

### 1.2 新增表
| 表名 | 字段 | 索引 | 说明 |
|------|------|------|------|

## 二、后端代码分析
### 2.1 可复用函数
| 函数 | 文件:行号 | 是否需修改 | 修改说明 |
|------|-----------|:----------:|----------|

### 2.2 需新增函数
| 函数 | 文件 | 输入 | 输出 |
|------|------|------|------|

### 2.3 API设计
| Method | Path | Handler | 鉴权 | 说明 |
|--------|------|---------|:----:|------|

### 2.4 错误码
| 错误码 | HTTP | 说明 | 场景 |
|--------|------|------|------|

## 三、前端代码分析
### 3.1 可复用组件
| 组件 | 文件 | 是否需修改 |
|------|------|:----------:|

### 3.2 需新增组件
| 组件 | 文件 | Props |
|------|------|-------|

### 3.3 路由
| 路由 | 组件 | 鉴权 |
|------|------|:----:|

## 四、边界条件与错误处理
| 场景 | 前端行为 | 后端行为 | HTTP |
|------|----------|----------|------|

## 五、契约层代码
### 5.1 Entity (Go struct + gorm tag + json tag)
### 5.2 DTO (Go struct + binding tag)
### 5.3 TypeScript类型
### 5.4 SQL DDL

## 六、涉及项目
- backend/api
- console

## 七、确认结论
`

export const SCHEMA_API_JSON = `# api.json 规范 (OpenAPI 3.0)

必含顶层: openapi, info, servers, paths, components.securitySchemes, components.schemas
每个接口必须: summary(中文), description, tags, security, parameters(含description和type), requestBody(含required和所有字段的description+校验规则), responses(200/400/401/403/404/500)
components.schemas: 抽取重复结构用$ref引用，每个字段含type+description+example

校验规则示例: minLength/maxLength/pattern/minimum/maximum/enum/default
required数组: 列出所有必填字段名
`

export const SCHEMA_PLAN = `# plan.md 模板

## Task 1: {API名称}
- **文件**: {后端文件路径}
- **业务流程**: {描述}
- **依赖**: {依赖的Task ID，无则写"无"}
- **输入**: design.md 中的 API 设计
- **输出**: {Handler + Service + Route}
- **实现要点**:
  - [ ] 要点1
  - [ ] 要点2
- **测试要求**:
  - 正常场景
  - 异常场景
  - 边界场景

## Task 2: ...
`

export const SCHEMAS: Record<string, string> = {
  checkpoint: SCHEMA_CHECKPOINT,
  "user-store": SCHEMA_USER_STORE,
  design: SCHEMA_DESIGN,
  "api.json": SCHEMA_API_JSON,
  plan: SCHEMA_PLAN,
}

export function resolveSchema(name: string): string {
  return SCHEMAS[name] || `未找到 schema: ${name}`
}

export const TASK_TEMPLATE_EXPLORE_CODE = `# 代码探索任务

探索代码库和数据库，返回结构化汇总给 Captain 做设计决策。不生成任何文件。

## 输入
- checkpoint.md：功能概述、验收条件
- user-store.md：用户故事、操作流程

## 执行
1. 读取 checkpoint.md 和 user-store.md，理解需求
2. 读取关键字使用 skill("standards") 获取代码规范和命名约定和业务逻辑
3. Grep 搜索相关实体名、函数名
4. LSP 分析（hover/goToDefinition/findReferences）
5. 如果需要数据库信息，使用 MCP MySQL 查询
6. 汇总结果直接返回（不写文件）

## 返回格式

以文本形式返回以下结构化汇总：

### 1. 现有代码分析
后端可复用：函数/模块、文件:行号、是否需修改、说明
前端可复用：组件/模块、文件、是否需修改、说明

### 2. 数据库分析
现有表：表名、相关字段、说明
需新增/修改：表名、操作、字段、说明

### 3. 外部依赖
依赖模块、接口、说明

### 4. 风险点
列出需要注意的风险

## 禁止
- 写任何文件
- 写实现代码
- 跳过数据库连接
- 产出无对比依据的结论
`

export const TASK_TEMPLATE_GENERATE_PREVIEW = `# 生成预览任务

基于设计文档生成可运行的前端原型。

## 输入
- design.md：设计文档

## 执行
1. 读取 design.md，理解页面结构和交互
2. 生成 preview.html（单文件 React/Vue 组件原型）
3. 包含基础交互：Tab切换、表单校验、按钮点击

## 输出
- preview.html

## 要求
- 单 HTML 文件，内含 CSS 和 JS
- 使用 CDN 引入 React/Vue
- 包含所有页面的组件
- 样式美观，接近真实 UI
- 支持基础交互（不需要真实 API 调用）

## 禁止
- 需要构建工具才能运行
- 依赖本地文件或外部 API
- 产出无法直接打开的文件
`

export const TASK_TEMPLATE_SPLIT_TASKS = `# 任务拆分任务

将设计文档拆分为可执行的原子任务，并维护到 kanban。

## 输入
- design.md：设计文档
- api.json：API 定义
- kanbanPath：kanban.md 路径

## 执行
1. 读取 design.md 和 api.json
2. 提取所有 API 端点
3. 每个 API 端点拆为一个 Task
4. 分析依赖关系
5. 生成 plan.md
6. 将每个 Task 维护到 kanban（调用 dct_task）

## 输出格式
\`\`\`markdown
# 任务拆分计划

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
\`\`\`

## 维护 kanban

plan.md 生成后，对每个 Task 调用 dct_task：
\`\`\`
dct_task(kanbanPath: "<kanbanPath>", taskId: "task-001", status: "待开始")
dct_task(kanbanPath: "<kanbanPath>", taskId: "task-002", status: "待开始")
...
\`\`\`

## 禁止
- 将 handler 和 service 拆为两个 Task
- 遗漏 design.md 中的设计点
- Task 上下文 > 500 行或 < 30 行
`

export const TASK_TEMPLATES: Record<string, string> = {
  explore_code: TASK_TEMPLATE_EXPLORE_CODE,
  generate_preview: TASK_TEMPLATE_GENERATE_PREVIEW,
  split_tasks: TASK_TEMPLATE_SPLIT_TASKS,
}

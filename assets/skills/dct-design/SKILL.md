---
name: dct-design
description: "阶段二：方案设计。对比真实数据库和现有代码，生成可逐条确认的方案设计文档。所有结论必须是可逐条确认的 check item。"
compatibility: opencode
metadata:
  workflow: dream-come-true
  stage: 2
---

# 阶段二：方案设计

基于阶段一的澄清需求，对比真实数据库和现有代码库，生成完整的方案设计文档。

核心原则：**不写实现代码，只做设计决策。每条决策都可独立确认。**

## 输入

- requirement.md、fields.md、checkpoint.md、boundary.md

## 产物

| 产物 | 说明 |
|------|------|
| `prd/{...}/design-analysis.md` | 设计分析报告（含设计决策点） |
| `prd/{...}/design.md` | 方案设计文档（含逐条确认清单） |
| `prd/{...}/api.json` | OpenAPI 3.0 接口定义 |
| `prd/{...}/test-case.md` | 测试用例（覆盖所有验收点） |

## 执行流程

### Step 1 — 加载项目规范

调用 `skill({name: "standards"})` 获取项目架构、分层目录、命名约定、安全原则。如该 skill 不存在则跳过。

### Step 2 — 数据库变更分析

**必须连接真实数据库**（通过 MCP MySQL 工具）。

1. 从 fields.md 提取所有实体名
2. 查询 INFORMATION_SCHEMA 获取真实表字段列表
3. 逐字段对比：已存在/需新增/需修改
4. 写入 design.md § 一（数据库变更分析）

### Step 3 — 后端代码复用分析

通过 standards 确定搜索目录和命名模式，或从已有项目结构推断分层目录。

1. Grep 在限定目录内搜索实体名、函数名
2. LSP 精确分析（hover/goToDefinition/incomingCalls/findReferences）
3. 判断：可复用/需修改/需新增/不可复用
4. 写入 design.md § 二

### Step 4 — 前端代码复用分析

1. 浏览 `frontend/` 或 `web/` 等目录，判断技术栈
2. Glob 搜索相关组件、hooks、页面
3. LSP 精确分析（documentSymbol/hover/findReferences）
4. 判断：可复用/可扩展/需新建
5. 写入 design.md § 三

### Step 5 — 设计决策收集与确认

1. 生成设计分析报告，包含所有技术分析和设计决策点
2. 用 question 工具分组呈现决策点，让用户选择
3. 记录决策结果到 design-analysis.md
4. 等待用户确认

### Step 6 — 生成契约层代码

基于确认的字段和 API 设计，生成 Go struct、DTO、TypeScript 类型、SQL DDL。写入 design.md § 五。

### Step 7 — 生成 api.json

OpenAPI 3.0 格式，调用 `captain_schema({stage: 2})` 获取 api.json 格式规范。

### Step 8 — 生成 test-case.md

覆盖 checkpoint.md 中每一个验收点。

### Step 9 — 生成 design.md

基于 design-analysis.md 和用户决策生成最终设计文档。

## 禁止行为

- 禁止跳过数据库连接步骤
- 禁止在方案设计中写实现代码
- 禁止产出没有对比依据的结论

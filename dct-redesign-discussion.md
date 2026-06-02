# DCT流程重构讨论总结

> 日期: 2025-01-15
> 状态: 已确认方案，待实施

## 背景

讨论是否可以合并需求澄清和方案设计两个阶段，最终演变为对整个DCT流程的重新设计。

## 核心设计原则

1. **弱化阶段，任务驱动**：Captain根据状态决定下一步，不再有严格的阶段1→2→3→4→5→6流程
2. **明确的事情交由subagent**：Captain只做编排和决策，具体执行交给subagent
3. **里程碑配置文件定义**：pipeline.config.json
4. **Captain根据任务返回判断**：是否需要更多任务
5. **完全灵活，Captain自由编排**：但有最小约束

## DCT流程范围

**DCT只负责**：需求分析 → 设计 → 任务拆分

**代码和测试**：另外的流程（不在DCT中）

## 里程碑定义

| 里程碑 | 名称 | 产物 |
|--------|------|------|
| M1 | 需求分析与设计 | checkpoint.md, user-store.md, design-analysis.md, design.md, api.json, test-case.md, preview.html |
| M2 | 任务拆分 | plan.md |

## Agent职责

### Captain（决策者+编排者）

| 职责 | 说明 |
|------|------|
| **与用户交互** | 追问需求、确认设计决策、确认产物 |
| **判断当前状态** | 根据已有产物，决定下一步需要什么 |
| **派遣任务** | 构造上下文，派sailor执行 |
| **汇总结果** | 接收sailor返回，更新状态，继续编排 |

### Sailor（Captain的按需助手）

| 任务类型 | 职责 | 输入 | 输出 |
|----------|------|------|------|
| `analyze_code` | 读代码、查数据库 | checkpoint.md, user-store.md | analysis_result.md |
| `generate_design` | 生成设计文档 | analysis_result.md + 决策结果 | design.md, api.json, test-case.md |
| `generate_preview` | 生成前端HTML预览 | design.md | preview.html（可运行的React/Vue原型） |
| `split_tasks` | 原子拆分 | design.md, api.json | plan.md（每个API端点一个Task） |

### Stevedore（TDD执行器）

按wave执行TDD编码（不在DCT中）。

### Inspector（AI审查）

审查产物一致性（不在DCT中）。

## Kanban设计

### 格式：Obsidian Kanban插件格式

```markdown
---
kanban-plugin: basic
---

## 待办

- [ ] M1: 需求分析与设计
  - 产物: checkpoint.md, user-store.md, design-analysis.md, design.md, api.json, test-case.md, preview.html
  - 状态: 待开始

## 进行中

## 已完成

## 归档
```

### 卡片状态

| 状态 | 标记 | 说明 |
|------|------|------|
| 待开始 | `- [ ]` | 未开始 |
| 进行中 | `- [/]` | 正在执行 |
| 已完成 | `- [x]` | 已完成 |
| 已阻塞 | `- [!]` | 被阻塞 |

### Captain Tool接口

```typescript
// 查看当前进度（精确到文件）
captain_kanban_view({ milestone?: string }) → 返回里程碑和产物状态

// 修改卡片状态
captain_kanban_update({
  card_id: string,
  status: "todo" | "doing" | "done" | "blocked",
  artifact?: { file: string, status: "pending" | "in_progress" | "done" }
}) → 返回操作结果
```

## 任务拆分（M2产出）

每个API端点一个Task，格式：

```markdown
## Task 1: 用户列表API
- **文件**: backend/api/internal/handler/user.go
- **业务流程**: 查询用户列表，支持分页、搜索
- **依赖**: 无
- **输入**: design.md中的API设计
- **输出**: User handler + service + route
```

## 完整流程

```
1. 用户输入需求
   ↓
2. Captain用question追问用户
   → 产出：checkpoint.md, user-store.md
   → 更新kanban: M1状态→进行中
   ↓
3. Captain派sailor(analyze_code)
   → 返回：analysis_result.md
   ↓
4. Captain用question确认设计决策
   → 产出：design-analysis.md
   ↓
5. Captain派sailor(generate_design)
   → 产出：design.md, api.json, test-case.md
   ↓
6. Captain派sailor(generate_preview)
   → 产出：preview.html（可运行的React/Vue原型）
   ↓
7. Captain用question让用户确认preview.html
   - 如果符合预期 → 继续
   - 如果不符合 → 返回步骤5修改design.md
   ↓
8. Captain用question确认M1完成
   → 更新kanban: M1状态→已完成
   ↓
9. Captain派sailor(split_tasks)
   → 产出：plan.md（每个API端点一个Task）
   → 更新kanban: 添加Task卡片
   ↓
10. Captain用question确认M2完成
    → 更新kanban: M2状态→已完成
    ↓
11. DCT流程结束
```

## 产物详情

### checkpoint.md（合并原requirement.md + fields.md + boundary.md）

- 功能概述
- 功能范围（包含/不包含）
- 外部依赖
- 字段定义
- 验收条件（正常/异常/边界）
- 边界条件与约束
- 非功能需求

### user-store.md（新增）

- 用户故事（作为...我想要...以便...）
- 操作流程（步骤、操作、系统响应、页面）
- 页面清单

### design-analysis.md

- 设计决策记录
- 决策点及用户选择

### design.md

- 数据库变更分析
- 后端代码复用分析
- 前端代码复用分析
- 设计决策
- 契约层代码（Entity/DTO/TS类型/SQL DDL）
- 涉及项目

### api.json

- OpenAPI 3.0格式
- 包含所有API端点定义

### test-case.md

- 测试用例
- 覆盖checkpoint.md中所有验收点

### preview.html

- 可运行的React/Vue组件原型
- 包含基础交互（Tab切换、表单校验、按钮点击）
- 用户确认后再继续

### plan.md

- 任务拆分
- 每个API端点一个Task
- 包含：文件、业务流程、依赖、输入、输出

## 需要修改的文件

| 文件 | 修改内容 |
|------|----------|
| `pipeline.ts` | 改为里程碑配置，从pipeline.config.json读取 |
| `stage-instructions.ts` | 改为`task-templates.ts`，定义sailor任务模板 |
| `schemas.ts` | 保持产物模板，移除阶段关联 |
| `dct-engine.ts` | 重写captain_next，支持里程碑驱动；新增captain_kanban_view和captain_kanban_update |
| `kanban-manager.ts` | 重写，支持Obsidian Kanban格式，精确到文件的产物状态 |
| `.agents/captain/AGENTS.md` | 重写，定义新职责和流程 |
| `.agents/sailor/AGENTS.md` | 重写，定义为Captain助手，支持多种任务模板 |
| `README.md` | 更新文档 |

## 决策记录

| 问题 | 选项 | 决策 |
|------|------|------|
| 阶段1+2是否合并 | 是/否 | **是**，合并为M1需求分析与设计 |
| Sailor职责 | 阶段执行者/Captain助手 | **Captain助手**，按需派遣 |
| 里程碑定义方式 | 硬编码/配置文件/动态创建 | **配置文件**（pipeline.config.json） |
| 产物检查机制 | 固定产物/Captain判断/用户确认 | **Captain根据任务返回判断** |
| Kanban格式 | 简单格式/完整格式 | **完整格式**（Obsidian Kanban插件） |
| Task粒度 | 每个文件/每个业务流程/每个API端点 | **每个API端点** |
| preview.html | 静态/基础交互/可运行原型 | **可运行的React/Vue组件原型** |
| milestone确认 | 自动检查/用户确认/任务返回 | **用户确认**（question工具） |

## 下一步

进入实施阶段，修改相关文件。

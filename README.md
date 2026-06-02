# dream-come-true for opencode

> 将模糊的 idea 经过里程碑驱动的流水线变成可执行的任务计划 — 开源、零配置、任意项目通用

## 安装

```bash
# 全局安装（推荐）
npm install -g dream-come-true

# 或项目安装
npm install --save-dev dream-come-true
```

安装后 `agents/` 和 `skills/` 自动复制到 `~/.config/opencode/`。

## 配置 opencode.json

在你的 `~/.config/opencode/opencode.json` 中添加：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "deepseek-chat",
  "plugin": ["dream-come-true"],
  "agent": {
    "captain": {
      "description": "dream-come-true 主控 Agent。里程碑驱动：需求分析与设计(M1) → 任务拆分(M2)",
      "mode": "primary",
      "permission": {
        "read": "allow", "edit": "allow", "bash": "allow",
        "task": { "*": "allow" }, "skill": { "*": "allow" }, "question": "allow",
        "glob": "allow", "grep": "allow", "lsp": "allow"
      },
      "color": "#8b5cf6"
    },
    "sailor": {
      "description": "执行具体任务：explore_code / generate_preview / split_tasks",
      "mode": "subagent", "hidden": true,
      "permission": { "read": "allow", "edit": "allow", "bash": "allow", "glob": "allow", "grep": "allow", "lsp": "allow", "question": "allow", "task": "deny" },
      "color": "#3b82f6"
    }
  }
}
```

## 使用

```bash
cd /path/to/your/project
opencode
# captain 为默认 agent，直接输入需求即可
```

## 工作流程

```
用户输入需求
  → captain（决策者+编排者）
    → M1: 需求分析与设计
      → Captain 追问 → 生成 checkpoint.md、user-store.md
      → sailor(explore_code): 探索代码、查数据库 → 返回汇总
      → Captain 基于汇总生成 design.md、api.json、test-case.md
      → Captain 判断涉及前端 UI → 询问用户
      → 用户同意 → sailor(generate_preview): 生成 preview.html → 用户确认
    → M2: 任务拆分
      → sailor(split_tasks): 每个API端点一个Task → 生成 plan.md
    → 完成
```

## 设计原则

1. **弱化阶段，任务驱动**：Captain 根据状态决定下一步
2. **Captain 做设计决策**：代码探索交给 sailor 汇总，Captain 基于汇总生成设计
3. **每个产物独立卡片**：完成一个更新一个
4. **可选产物**：preview.html 由 Captain 判断是否需要，用户确认后生成

## 里程碑

| 里程碑 | 名称 | 产物 |
|--------|------|------|
| M1 | 需求分析与设计 | checkpoint.md, user-store.md, design.md, api.json, test-case.md, preview.html(可选) |
| M2 | 任务拆分 | plan.md |

## 产物生成规则

| 产物 | 生成者 | 方式 |
|------|--------|------|
| checkpoint.md | Captain | 追问用户后直接生成 |
| user-store.md | Captain | 追问用户后直接生成 |
| design.md | Captain | sailor 探索汇总后，Captain 生成 |
| api.json | Captain | 与 design.md 同时生成 |
| test-case.md | Captain | 与 design.md 同时生成 |
| preview.html | sailor | Captain 询问用户同意后，sailor 生成 |
| plan.md | sailor | 直接生成 |

## Kanban 展示

kanban.md 使用 Obsidian Kanban 插件格式，每个产物独立卡片：

```markdown
---
kanban-plugin: basic
---

## 待办
- [ ] M1: checkpoint.md
- [ ] M1: user-store.md
- [ ] M1: design.md
- [ ] M1: api.json
- [ ] M1: test-case.md
- [ ] M1: preview.html
- [ ] M2: plan.md

## 进行中
## 已完成
## 已跳过
```

## 架构

| component | type | 说明 |
|-----------|------|------|
| DreamComeTruePlugin | Plugin | JS 引擎，注册 custom tool |
| captain | Primary agent | 决策者+编排者，生成设计文档 |
| sailor | Subagent | 探索代码、生成预览、拆分任务 |

## 文件结构

```
prd/2026-06-02-v1.0.0_用户登录_fzp/
  .dct-state.json     ← 状态数据（脚本读写）
  kanban.md           ← 展示文件（hook 自动生成）
  checkpoint.md
  design.md
  ...
```

## 工具

| 工具 | 用途 |
|------|------|
| `dct_run` | 启动流水线 |
| `dct_next` | 获取当前 action |
| `dct_kanban_view` | 查看 kanban 状态 |
| `dct_kanban_update` | 更新 kanban 卡片/产物状态 |
| `dct_status` | 查看状态摘要 |
| `dct_task` | 更新任务状态 |
| `obsidian` | Obsidian 操作 |

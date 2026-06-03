# dream-come-true for opencode

> 将模糊的 idea 经过看板驱动的流水线变成可执行的任务计划 — 开源、零配置、任意项目通用

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
    "worker": {
      "description": "dream-come-true Worker Agent。读取看板获取任务，执行任务，更新看板状态。",
      "mode": "primary",
      "permission": {
        "read": "allow", "edit": "allow", "bash": "allow",
        "task": { "*": "allow" }, "skill": { "*": "allow" }, "question": "allow",
        "glob": "allow", "grep": "allow", "lsp": "allow"
      },
      "color": "#10b981"
    }
  }
}
```

## 使用

```bash
cd /path/to/your/project
opencode
# Worker 为默认 agent，直接输入需求即可
```

## 工作流程

```
用户输入需求
  ↓
Worker 调用 dct_run 创建看板
  ↓
Worker 读取 kanban.md，获取当前任务
  ↓
Worker 调用 dct_task_context 获取任务上下文
  ↓
Worker 执行任务
  ↓
Worker 直接修改 kanban.md 更新状态
  ↓
循环直到所有任务完成
```

## 设计原则

1. **看板是唯一的任务状态源**：kanban.md 只包含任务状态，简洁明了
2. **任务上下文通过 tool 获取**：Worker 调用 dct_task_context 获取任务模板
3. **M1 M2 需要用户确认**：其他任务自动执行
4. **任务失败时分析依赖**：如果有依赖，需要用户干预；如果没有，继续执行

## 里程碑

| 里程碑 | 名称 | 产物 | 需要用户确认 |
|--------|------|------|:------------:|
| M1 | 需求分析与设计 | checkpoint.md, user-store.md, design.md, api.json, test-case.md, preview.html(可选) | ✓ |
| M2 | 任务拆分 | tasks.md | ✓ |
| M3 | 编码任务 | 代码文件 | ✗ |

## 工具

| 工具 | 用途 |
|------|------|
| `dct_run` | 创建看板，启动流程 |
| `dct_task_context` | 获取任务上下文（模板） |
| `dct_validate` | 验证任务产物 |
| `obsidian` | Obsidian 操作 |

## Kanban 展示

kanban.md 使用 Obsidian Kanban 插件格式，只包含任务状态：

```markdown
---
kanban-plugin: basic
---

# 用户登录功能

## 待办里程碑
- [ ] M1: 需求分析与设计
- [ ] M2: 任务拆分

## 进行中的里程碑

## 已完成里程碑

## 编码任务

## 进行中

## 已完成
```

## 架构

| component | type | 说明 |
|-----------|------|------|
| DreamComeTruePlugin | Plugin | JS 引擎，注册 custom tool |
| Worker | Primary agent | 读取看板、执行任务、更新看板 |

## 文件结构

```
prd/2026-06-02-v1.0.0_用户登录_fzp/
  kanban.md           ← 看板文件（只包含状态）
  checkpoint.md
  design.md
  ...
```

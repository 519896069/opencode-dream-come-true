---
name: captain
description: "帮助用户完成 idea 到代码实现的完整流程。调用 captain_run/captain_next/captain_mark/captain_schema/captain_status 工具驱动流程。"
compatibility: opencode
metadata:
  workflow: dream-come-true
  version: "2.0.0"
---

# dream-come-true 工作流

通过插件工具驱动 6 阶段流水线。不要自己做阶段执行。

## 启动

```
captain_run(theme: "<需求描述>", mode: "deep")
```

## 循环

调用 `captain_next()` 获取 action JSON，按 action 执行：

| action | 处理方式 |
|--------|----------|
| `sailor` | `task({subagent_type: "sailor", prompt: "..."})`。sailor 返回后立即调 `captain_next()` |
| `execution_plan` | 阶段四专用。按 wave 顺序派遣 stevedore：同 wave 并行 `task({subagent_type: "stevedore"})`，wave 间串行。全部完成后调 `captain_mark(statusPath, "阶段四", "artifacts")`，再调 `captain_next()` |
| `inspector` | `task({subagent_type: "inspector", prompt: "..."})`。返回后调 `captain_next()` |
| `confirm` | `question` 工具让用户选择（通过/修改/打回）。通过 → `captain_mark(userConfirm=[✅])` → `captain_next()`；修改 → 带 feedback 再调 `captain_next()` |
| `mark_pass` | 快速模式专用。`captain_mark(statusPath, stage, "userConfirm")` → `captain_next()` |
| `done` | 输出最终产物清单 |

## 阶段四详解

1. 首次 `captain_next()` 返回 `sailor` 且 `no_status_update: true` → 派遣 sailor 时加上 "不要更新 status.md"
2. sailor 写入 `.opencode/run/latest-execution-plan.json`
3. sailor 返回 → `captain_next()` → 此次返回 `execution_plan`（含 waves/tasks/statusPath）
4. 按 wave 逐个派遣 stevedore，同 wave 内并行 task({subagent_type: "stevedore"})：
   ```
     task({subagent_type: "stevedore", description: task.agent_description, prompt: task.prompt})
   ```
   等待本 wave 全部完成后再进入下一 wave
5. 全部 wave 完成 → `captain_mark(statusPath, "阶段四", "artifacts")` → `captain_next()` → 进入 inspector

## 其他工具

- `captain_mark(statusPath, stage, column)` — 更新 status.md 标记
- `captain_schema(stage)` — 查询产物格式模板路径
- `captain_status()` — 查看当前状态摘要

## 约束

- sailor/inspector 返回后立即调 captain_next，不输出中间文字
- 用户确认用 question 工具，不代答
- 阶段四 stevedore 由你通过 task 工具直接派发，同 wave 并行

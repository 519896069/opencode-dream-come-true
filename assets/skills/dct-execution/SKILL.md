---
name: dct-execution
description: "阶段四：TDD 执行调度。读取 plan.md 拆分执行单元，分析依赖编排波次，返回 execution_plan 供 captain_execute_wave 调度 stevedore。本 Skill 只做分析和调度，不写代码。"
compatibility: opencode
metadata:
  workflow: dream-come-true
  stage: 4
---

# 阶段四：TDD 执行调度

阶段四分两步走：
1. **本 Skill（调度）**：读取 plan.md → 解析执行单元 → 分析依赖编排波次 → 输出 execution_plan
2. **captain_execute_wave（执行）**：按波次并发派遣 stevedore，每个实例接收一个单元的完整契约，按 TDD 循环生成代码

核心原则：**本 Skill 只做分析和调度，不写代码。**

## 执行流程

### Step 1 — 读取 plan.md

读取 `prd/{YYYY-MM-DD-<英文简述>}/plan.md`，提取执行单元表格和每个 Task 的完整契约。

### Step 2 — 编排波次

根据执行单元的依赖列做拓扑排序，分组为 wave。同一 wave 内的 unit 互不依赖，可并行执行。Wave 之间串行。

### Step 3 — 生成 execution_plan

输出 execution_plan，写入文件 `.opencode/run/latest-execution-plan.json`，内容包含 waves 和每个 task 的完整 prompt。

## execution_plan 格式

```json
{
  "total_units": 6,
  "waves": [
    { "wave": 1, "unit_ids": ["U-001"], "note": "前置契约" },
    { "wave": 2, "unit_ids": ["U-002", "U-003"], "note": "可并行" }
  ],
  "tasks": [
    {
      "unit_id": "U-001",
      "work_dir": "worktree/dev_v1.2.3/feature-xxx/backend/api",
      "agent_description": "U-001 Entity+DDL+DTO",
      "prompt": "完整的工作指令..."
    }
  ]
}
```

## 禁止行为

- ❌ 跳过 plan.md 直接生成代码
- ❌ 自己写代码

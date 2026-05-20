# dream-come-true for opencode

> 将模糊的 idea 经过 6 阶段流水线变成生产级代码 — 开源、零配置、任意项目通用

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
  "plugin": ["dream-come-true"],
  "agent": {
    "captain": {
      "description": "dream-come-true 主编排器。通过 captain_run/captain_next/captain_mark/captain_schema/captain_status 工具驱动 6 阶段流水线，将模糊需求转化为生产级代码",
      "mode": "primary",
      "permission": {
        "read": "allow", "edit": "ask", "bash": "allow",
        "task": "*", "skill": "*", "question": "allow",
        "glob": "allow", "grep": "allow", "lsp": "allow"
      },
      "color": "#2563eb"
    },
    "sailor": {
      "description": "阶段执行 Agent。执行单个阶段的完整流程：调用阶段 Skill → 生成产物 → 更新 status.md → 返回结果。不执行 AI 审查。",
      "mode": "subagent", "hidden": true,
      "permission": { "read": "allow", "edit": "allow", "bash": "allow", "glob": "allow", "grep": "allow", "lsp": "allow", "skill": "allow", "question": "allow", "task": "deny" },
      "color": "#3b82f6"
    },
    "stevedore": {
      "description": "阶段四 TDD 执行器。接收完整契约 prompt，严格按 RED→GREEN→验证 循环将实现要点 checklist 翻译为代码。使用快速模型。",
      "mode": "subagent", "hidden": true,
      "model": "anthropic/claude-haiku-4-20250514",
      "permission": { "read": "allow", "edit": "allow", "bash": "allow", "glob": "allow", "grep": "allow", "lsp": "allow", "skill": "deny", "task": "deny", "question": "deny" },
      "color": "#16a34a"
    },
    "inspector": {
      "description": "AI 文档一致性审查 Agent。审查阶段产物的一致性，以 checkpoint.md 为准，发现问题后自动修复。",
      "mode": "subagent", "hidden": true,
      "permission": { "read": "allow", "edit": "allow", "glob": "allow", "grep": "allow", "lsp": "allow", "bash": "deny", "skill": "deny", "task": "deny", "question": "deny" },
      "color": "#ca8a04"
    }
  },
  "permission": { "skill": { "*": "allow" } }
}
```

## 使用

```bash
cd /path/to/your/project
opencode
# Tab 切换到 captain agent
# 输入你的需求即可
```

## 自定义阶段流程（可选）

在项目根目录创建 `pipeline.config.json`：

```json
{
  "stages": [
    { "number": 1, "name": "需求澄清", "skill": "dct-normalization", "artifacts": ["requirement.md", "fields.md", "checkpoint.md", "boundary.md"], "effort": "high", "aiReview": false, "parallel": false },
    { "number": 2, "name": "方案设计", "skill": "dct-design", "artifacts": ["design-analysis.md", "design.md", "api.json", "test-case.md"], "effort": "max", "aiReview": true, "parallel": false }
  ]
}
```

不创建则使用内置默认的 6 阶段配置。

## 工作流程

```
用户输入需求
  → captain（主编排器）
    → Stage 1: 需求澄清（dct-normalization + sailor）
    → Stage 2: 方案设计（dct-design + sailor + inspector）
    → Stage 3: 原子拆分（dct-planning + sailor + inspector）
    → Stage 4: TDD 执行（dct-execution + sailor → 波次派 stevedore）
    → Stage 5: 代码审查（dct-review + sailor + inspector）
    → Stage 6: 集成测试+E2E（dct-testing + sailor）
  → 完成
```

## 架构

| component | type | 说明 |
|-----------|------|------|
| DreamComeTruePlugin | Plugin | JS 引擎，注册 5 个 custom tool |
| captain | Primary agent | 编排者，调工具驱动循环 |
| sailor | Subagent | 阶段执行（stages 1-6） |
| stevedore | Subagent | TDD 代码生成（stage 4） |
| inspector | Subagent | AI 审查（stages 2-5） |
| dct-* | Skill | 各阶段的实现指令 |

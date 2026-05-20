---
name: dct-testing
description: "阶段六：集成测试 + E2E 测试。基于 api.json 和 design.md 生成测试代码，执行后收集结果，生成 test-report.md（含 BUG 追踪表）。"
compatibility: opencode
metadata:
  workflow: dream-come-true
  stage: 6
---

# 阶段六：集成测试 + E2E 测试

在阶段四 TDD（单元测试）和阶段五审查验收之后，进行系统性验证。

## 输入

- design.md、api.json、checkpoint.md、review-log.md
- 阶段四产出的代码文件

## 产物

| 产物 | 说明 |
|------|------|
| `prd/{YYYY-MM-DD-<英文简述>}/test-report.md` | 测试报告 |

## 执行流程

### Step 1 — 提取测试范围

读取 design.md + api.json + checkpoint.md，提取：
- API 端点清单（路径、方法）
- 前端页面清单（组件/页面）
- 验收场景列表（CP-001, CP-002, ...）

### Step 2 — 生成集成测试

对 api.json 中每个端点生成集成测试代码。

**Go 后端**：
- 使用 `net/http/httptest` + Gin 测试路由
- 每个端点覆盖：正常请求、参数校验、认证、异常响应
- 数据库验证：请求完成后查询 DB

### Step 3 — 运行集成测试

```bash
cd backend/api && go test -gcflags=all=-l -v -cover -tags=integration ./...
```

### Step 4 — BUG 修复循环

分析失败原因 → 修复代码 → 重跑。最多 3 次。

### Step 5 — E2E 测试

集成测试通过后，生成 E2E 测试：

**前端（Playwright）**：
- 覆盖 checkpoint.md 中的验收场景
- 模拟用户操作路径

```bash
cd frontend && npx playwright test
```

### Step 6 — 生成 test-report.md

汇总所有结果，按模板生成报告。

### Step 7 — 返回 JSON

```json
{
  "stepname": "集成测试+E2E",
  "status": "完成",
  "files": ["prd/{...}/test-report.md"],
  "test_results": {
    "integration": { "total": 12, "passed": 10, "failed": 2, "coverage": "85%" },
    "e2e": { "total": 6, "passed": 5, "failed": 1 },
    "bugs": { "fixed": 2, "unresolved": 1 }
  },
  "timestamp": "<ISO8601>"
}
```

## 质量标准

| 规则 | 说明 |
|------|------|
| 集成测试全覆盖 | api.json 中每个端点至少 1 个集成测试用例 |
| 数据库验证 | 写操作必须验证 DB 状态 |
| E2E 覆盖关键路径 | 每个验收场景必须有对应 E2E 测试 |
| BUG 必录 | 无法自动修复的失败必须记录 |
| 修复即改代码 | 发现 BUG 直接修复，同步更新测试 |

## 禁止行为

- ❌ 跳过集成测试直接跑 E2E
- ❌ 修改 api.json 中的预期行为
- ❌ 删除失败测试而非修复代码
- ❌ BUG 不记录直接跳过

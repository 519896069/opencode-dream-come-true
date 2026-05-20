---
name: dct-review
description: "阶段五：四层审查验收。DB vs Entity → API 四方一致 → 跨 Task 契约对齐 → 测试与编译。以 spec 为唯一事实来源。"
compatibility: opencode
metadata:
  workflow: dream-come-true
  stage: 5
---

# 阶段五：审查验收

逐层验证阶段四产出的代码与阶段一到三的 spec 完全一致。四层审查，逐层通过才进入下一层。

核心原则：**以 spec 为唯一事实来源，修复即改代码，同步更新测试。**

## 输入

- design.md、api.json、plan.md、checkpoint.md
- 阶段四的实际代码产出

## 产物

| 产物 | 说明 |
|------|------|
| `prd/{YYYY-MM-DD-<英文简述>}/review-log.md` | 四层审查报告 |

## 第一层：数据库 vs Entity 交叉检查

### 1.1 提取 Entity 信息

从阶段四修改的 Entity 文件中，提取所有带 `gorm:"column:xxx"` tag 的字段。

### 1.2 查询真实数据库

通过 MCP MySQL 工具执行：

```sql
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '<table_name>'
```

### 1.3 交叉比对

| 检查项 | 说明 |
|------|------|
| Entity 字段存在性 | gorm tag 中的列名必须存在于数据库 |
| 类型匹配 | Go 类型与 MySQL 类型正确映射 |
| json tag | json tag 与 fields.md 中定义的字段名一致 |
| DDL 一致性 | 确认数据库已执行变更 |

最多重试 3 次。

## 第二层：API 四方一致检查

以 api.json 为唯一事实来源，确保四方一致：

| 方 | 文件 | 检查内容 |
|------|------|------|
| api.json | api.json | 基准 |
| 后端 handler | handler/ router/ | 路径、方法、请求/响应字段、校验规则 |
| 前端调用 | api/ types/ | TS 类型、请求路径、表单字段 |
| design.md 契约 | design.md §五 | Entity/DTO/TypeScript 签名 |

以 api.json 为准修改后端/前端/design.md。最多重试 3 次。

## 第三层：跨 Task 契约对齐检查

验证 plan.md 中每个 Task 的实际产出与契约一致：

- 产出文件是否存在
- 导出的函数名、参数类型、返回值类型是否与输出契约一致
- 无遗漏、无多余导出
- 下游 Task 引用的上游类型是否一致
- 接口间无非法交叉引用

修复实际代码使其与契约对齐。最多重试 3 次。

## 第四层：测试与编译

```
# Go 后端
go test -gcflags=all=-l ./... -v -cover
go build ./... && go vet ./...

# 前端
npx jest --coverage
npx tsc --noEmit
```

要求：分支覆盖率 >= 80%。不足则补充测试。最多重试 3 次。

## 审查报告

调用 `captain_schema({stage: 5})` 获取 review-log.md 的格式模板，按格式生成报告。

## 重要规则

1. 每层失败必须修复，不能带着失败进入下一层
2. 最多重试 3 次
3. api.json 是唯一事实来源
4. 契约不可改，修改代码对齐契约
5. 修复即改代码，同步更新测试
6. 必须连真实数据库（第一层）

---
name: dct-planning
description: "阶段三：原子拆分。将方案设计拆分为三层 Task（前置契约/业务接口/前端UI），生成 DAG 和每个 Task 的输入输出契约。"
compatibility: opencode
metadata:
  workflow: dream-come-true
  stage: 3
---

# 阶段三：原子拆分

将阶段二的方案设计拆分为三层粒度的独立 Task，使得每个 Task 可以交给一个独立的执行 agent 完成。

核心原则：**契约下沉到 Entity/DTO 层，业务接口 Task 内部保持连续，接口之间高度并行。**

## 输入

- design.md、api.json、checkpoint.md、fields.md

## 产物

| 产物 | 说明 |
|------|------|
| `prd/{...}/plan.md` | Task DAG + 每个 Task 的完整契约 |

## 三层拆分模型

```
前置契约层（串行，有依赖链）
  ↓ 定义好所有数据结构和接口签名
业务接口层（高度并行，互不依赖）
  ↓ 每个 agent 拿到 Entity+DTO，完成 handler+service+测试
前端 UI 层（依赖对应接口，接口间可并行）
```

| 层级 | 粒度 | 一个 Task 包含 | 并行性 |
|------|------|------|:--:|
| 前置契约层 | 按数据结构 | Entity + DDL + DTO + TS 类型 | 串行 |
| 业务接口层 | 按 API 端点 | handler + service + route + 测试 | 并行 |
| 前端 UI 层 | 按独立组件 | 组件/页面 + 测试 | 依赖对齐后并行 |

## 执行流程

### Step 1 — 加载规范

调用 `skill({name: "standards"})` 获取项目架构、命名约定、安全原则。如不存在则跳过。

### Step 2 — 提取 Task 清单

```
前置契约层：design.md §五 的 Entity/DTO/TypeScript → 1-2 个 Task
业务接口层：api.json 的每个 endpoint → 1 个 Task
前端 UI 层：design.md §三 → 每个独立组件/页面 1 个 Task
```

### Step 3 — 分析依赖

```
实体间依赖 → 前置契约层内部串行
接口对 Entity 的依赖 → 所有接口 Task 依赖前置契约
前端对 接口+类型 的依赖 → 组件 Task 依赖对应的接口和类型 Task
```

### Step 4 — 为每个 Task 编写契约

每个 Task 契约包含：基本信息 + 输入契约 + 输出（文件路径+签名） + 实现要点 + 测试要求。

**前置契约层 Task 示例**：
```
## T1: User Entity + DDL + DTO
- 层级：前置契约
- 项目：backend/api
- 依赖：无

### 输入
- design.md § 五 → Entity/DTO 定义
- fields.md → 字段清单

### 输出
- backend/api/internal/model/user.go → User struct
- backend/api/internal/dto/user.go → CreateUserRequest/UpdateUserRequest/UserResponse
- DDL：CREATE TABLE users (...)

### 测试
- model/user_test.go
```

**业务接口层 Task 示例**：
```
## T3: POST /api/v1/users
- 层级：业务接口
- 项目：backend/api
- 依赖：T1

### 输入契约
- User Entity（来自 T1）
- CreateUserRequest DTO（来自 T1）

### 输出
- backend/api/internal/service/user.go → CreateUser
- backend/api/internal/handler/user.go → CreateUser handler
- router 注册

### 实现要点
Handler 层：
- [ ] 从 middleware.GetAuthInfo(ctx) 获取 team_id
- [ ] c.ShouldBindJSON(&req) 解析请求体
- [ ] 成功 → 200 + { id }
Service 层：
- [ ] 检查 name 在同 team_id 下的唯一性
- [ ] 构造 User struct，填充默认值
- [ ] 事务中写入 DB
路由：
- [ ] POST /api/v1/users，middleware: AuthRequired

### 测试要求
- handler/user_test.go
- 正常创建、缺少必填、name 重复、未认证、字段超长
```

**前端 UI 层 Task 示例**：
```
## T8: UserTable 组件
- 层级：前端 UI
- 项目：frontend/gxadmin-console
- 依赖：T2（类型+API签名）、T7（useUserList hook）

### 输出
- frontend/.../UserTable.tsx
- Props: { users, loading, onEdit, onDelete }

### 实现要点
- [ ] loading → 骨架屏/Spinner
- [ ] 空列表 → 空状态提示
- [ ] 正常列表 → 表格，每行 name/status/操作
- [ ] 删除前确认对话框

### 测试
- UserTable.test.tsx
```

### Step 5 — 生成执行单元

```markdown
| 单元ID | 包含 Task | 项目 | 产物目录 | 依赖单元 |
|--------|------|------|------|------|
| U-001 | T1 | api | backend/api/ | - |
| U-002 | T2 | console | frontend/gxadmin-console/ | U-001 |
| U-003 | T3, T4, T5, T6 | api | backend/api/ | U-001 |
| U-004 | T7 | console | frontend/gxadmin-console/ | U-002, U-003 |
| U-005 | T8, T9 | console | frontend/gxadmin-console/ | U-004 |
| U-006 | T10 | console | frontend/gxadmin-console/ | U-005 |
```

### Step 6 — 写入 plan.md 和更新 status.md

## 禁止行为

- 禁止在业务接口层拆 handler 和 service 为两个 Task
- 禁止在接口之间有实现级依赖（只依赖 Entity/DTO 契约）
- 禁止遗漏 design.md 中的任何设计点
- 禁止 Task 上下文 > 500 行
- 禁止 Task 上下文 < 30 行

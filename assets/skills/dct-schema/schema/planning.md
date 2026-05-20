# 阶段三：原子拆分

## 阶段产物

| 产物 | 说明 |
|------|------|
| `prd/{YYYY-MM-DD-<英文简述>}/plan.md` | 三层 Task DAG + 每个 Task 的输入输出契约 |

---

## 三层拆分模型

```
前置契约层: Entity/DDL/DTO/TS类型/API签名 — 仅数据结构契约
     ↓
业务接口层: handler+service+route+测试 — 一个接口一个 Task，互不依赖
     ↓
前端 UI 层: 组件/页面/hook+测试 — 依赖对应接口
```

契约边界在 Entity/DTO 层，接口之间仅通过数据结构耦合。每个业务接口 Task 的 agent 可以完整思考从请求解析到数据库调用的全链路。

---

## 产物规范

### plan.md 结构

```markdown
# 实现计划: {需求标题}

---

## 一、Task DAG 依赖图

\```
前置契约层:
  T1: User Entity + DDL + DTO [无依赖]
    ├─▶ T2: user.ts 类型 + userApi.ts 签名 [依赖 T1]

业务接口层（T3~T6 可并行）:
  T1 ──▶ T3: POST /api/v1/users —— 创建用户（handler + service + 测试）
  T1 ──▶ T4: GET /api/v1/users —— 用户列表（handler + service + 测试）
  T1 ──▶ T5: GET /api/v1/users/:id —— 用户详情（handler + service + 测试）
  T1 ──▶ T6: PUT /api/v1/users/:id —— 编辑用户（handler + service + 测试）

前端 UI 层:
  T2,T4 ──▶ T7: useUserList hook
  T2,T7 ──▶ T8: UserTable 组件
  T3,T5 ──▶ T9: UserForm 组件（创建 + 编辑共用）
  T7,T8 ──▶ T10: UserListPage 页面
\```

---

## 二、Task 契约

---

### T1: User Entity + DDL + DTO

**层级**：前置契约
**项目**：backend/api
**依赖**：无
**上下文估算**：约 150 行

#### 输入
- design.md § 五 → Entity/DTO 定义
- fields.md → User 字段清单

#### 输出
- `backend/api/internal/model/user.go`：
  \`\`\`go
  type User struct {
      Id        uint64    `gorm:"column:id;primaryKey" json:"id,string"`
      Name      string    `gorm:"column:name;size:50" json:"name"`
      AvatarUrl string    `gorm:"column:avatar_url;size:500" json:"avatar_url"`
      Status    int       `gorm:"column:status;default:1" json:"status"`
      CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
      UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
  }
  \`\`\`
- `backend/api/internal/dto/user.go`：
  \`\`\`go
  type CreateUserRequest struct {
      Name      string `json:"name" binding:"required,max=50"`
      AvatarUrl string `json:"avatar_url" binding:"omitempty,url,max=500"`
  }
  type UpdateUserRequest struct {
      Name      string `json:"name" binding:"required,max=50"`
      AvatarUrl string `json:"avatar_url" binding:"omitempty,url,max=500"`
  }
  type UserResponse struct {
      Id        uint64 `json:"id,string"`
      Name      string `json:"name"`
      AvatarUrl string `json:"avatar_url"`
      Status    int    `json:"status"`
      CreatedAt string `json:"created_at"`
  }
  \`\`\`
- DDL：
  \`\`\`sql
  CREATE TABLE users (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      avatar_url VARCHAR(500) DEFAULT '',
      status TINYINT DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  \`\`\`

#### 测试
- `backend/api/internal/model/user_test.go`
- 场景：gorm tag 与 json tag 一致性、序列化/反序列化

---

### T2: user.ts 类型 + userApi.ts 签名

**层级**：前置契约
**项目**：frontend/gxadmin-console
**依赖**：T1（Entity 字段定义）
**上下文估算**：约 100 行

#### 输入
- User Entity 字段：id(uint64→string), name(string), avatar_url(string), status(int→number), created_at(datetime→string)
- DTO 字段：CreateUserRequest, UpdateUserRequest, UserResponse

#### 输出
- `frontend/gxadmin-console/types/user.ts`：
  \`\`\`typescript
  export interface User {
    id: string
    name: string
    avatar_url: string
    status: number
    created_at: string
  }
  export interface CreateUserForm {
    name: string
    avatar_url: string
  }
  export interface UpdateUserForm {
    name: string
    avatar_url: string
  }
  export interface UserQuery {
    page: number
    page_size: number
    keyword?: string
  }
  \`\`\`
- `frontend/gxadmin-console/api/user.ts`（仅签名，不含实现体）：
  \`\`\`typescript
  export const userApi = {
    list: (params: UserQuery) => Promise<{ list: User[]; total: number }>,
    create: (data: CreateUserForm) => Promise<{ id: string }>,
    getById: (id: string) => Promise<User>,
    update: (id: string, data: UpdateUserForm) => Promise<void>,
  }
  \`\`\`

#### 测试
- TypeScript 编译检查（阶段五统一执行）

---

### T3: POST /api/v1/users —— 创建用户

**层级**：业务接口
**项目**：backend/api
**依赖**：T1
**上下文估算**：约 280 行

#### 输入契约
- User Entity（来自 T1 输出）
- CreateUserRequest DTO（来自 T1 输出）
- 参考：api.json → POST /api/v1/users
- 参考：standards → Go 三层架构、auth 模式（`GetAuthInfo(ctx)`）

#### 输出
- `backend/api/internal/service/user.go`：`func (s *UserService) CreateUser(ctx context.Context, req dto.CreateUserRequest) (*model.User, error)`
- `backend/api/internal/handler/user.go`：`func (h *UserHandler) CreateUser(c *gin.Context)`
- `backend/api/internal/router/user.go`：`router.POST("/api/v1/users", h.CreateUser)`

#### 实现要点
**Handler 层**：
- [ ] 从 `middleware.GetAuthInfo(ctx)` 获取 team_id
- [ ] `c.ShouldBindJSON(&req)` 解析请求体
- [ ] binding 校验失败 → 返回 400 + 字段级错误提示
- [ ] 调用 `service.CreateUser(ctx, req, team_id)`
- [ ] 成功 → 返回 200 + `{ id }`
- [ ] 失败 → 根据 error 类型返回对应 HTTP 状态码

**Service 层**：
- [ ] 检查 name 在同 team_id 下的唯一性
- [ ] name 重复 → 返回 `ErrDuplicate`
- [ ] 构造 User struct，填充默认值（status=1）
- [ ] 事务中写入 DB
- [ ] 返回创建的 User
- [ ] DB 错误 → 返回 `ErrInternal`

**路由**：
- [ ] `POST /api/v1/users`，middleware: `AuthRequired`

**错误码映射**：
| error | HTTP 状态码 |
|------|:--:|
| ErrDuplicate | 409 |
| ErrInternal | 500 |
| binding 失败 | 400 |

#### 测试要求
- `backend/api/internal/handler/user_test.go`
- 场景：
  - 正常创建 → 200 + 返回 id
  - 缺少 name → 400
  - name 重复 → 409
  - name 超长(>50) → 400
  - 未认证 → 401
  - 服务层错误 → 500

---

### T4: GET /api/v1/users —— 用户列表

**层级**：业务接口
**项目**：backend/api
**依赖**：T1
**上下文估算**：约 180 行

#### 输入契约
- User Entity（来自 T1 输出）
- 参考：api.json → GET /api/v1/users

#### 输出
- `backend/api/internal/service/user.go`：`func (s *UserService) ListUsers(ctx context.Context, req dto.UserQuery) ([]model.User, int64, error)`
- `backend/api/internal/handler/user.go`：`func (h *UserHandler) ListUsers(c *gin.Context)`
- `backend/api/internal/router/user.go`：`router.GET("/api/v1/users", h.ListUsers)`

#### 测试要求
- 场景：正常分页查询、空结果、keyword 搜索、分页越界

---

### T5: GET /api/v1/users/:id —— 用户详情
（略，格式同 T3/T4）

### T6: PUT /api/v1/users/:id —— 编辑用户
（略，格式同 T3/T4）

---

### T7: useUserList hook

**层级**：前端 UI
**项目**：frontend/gxadmin-console
**依赖**：T2（类型+API签名）、T4（GET /api/v1/users 接口可用）
**上下文估算**：约 80 行

#### 输入契约
- UserQuery 类型、User 类型（来自 T2）
- userApi.list 签名（来自 T2）
- T4 完成（接口真实可用）

#### 输出
- `frontend/gxadmin-console/hooks/useUserList.ts`
- 导出：`export const useUserList = (query: UserQuery) => { users, total, loading, error, refresh }`

#### 测试
- `hooks/useUserList.test.ts`
- 场景：正常加载数据、loading 状态、error 处理、refresh 刷新

---

### T8: UserTable 组件

**层级**：前端 UI
**项目**：frontend/gxadmin-console
**依赖**：T2（User 类型）、T7（useUserList hook）
**上下文估算**：约 160 行

#### 输入契约
- User 类型（来自 T2）
- useUserList hook 签名（来自 T7）

#### 输出
- `frontend/gxadmin-console/components/user/UserTable.tsx`
- Props：`{ users: User[], loading: boolean, onEdit: (id: string) => void, onDelete: (id: string) => void }`

#### 实现要点
- [ ] 接收 props：`users`, `loading`, `onEdit`, `onDelete`
- [ ] **loading=true** → 渲染骨架屏/Spinner
- [ ] **users=[]** → 渲染空状态提示"暂无数据"
- [ ] **正常列表** → 渲染表格/卡片，每行显示 name、status、操作按钮
- [ ] 操作按钮：编辑按钮调用 `onEdit(id)`，删除按钮调用 `onDelete(id)`
- [ ] 删除按钮点击前弹出确认对话框
- [ ] 使用 shadcn/ui Table / Card 组件（来自 standards 前端规范）

#### 测试
- `components/user/UserTable.test.tsx`
- 场景：
  - 正常渲染用户列表
  - loading 状态显示骨架屏
  - 空列表显示空状态提示
  - 编辑按钮点击触发 onEdit
  - 删除按钮点击弹出确认对话框
- Props：`{ users: User[], loading: boolean, onEdit: (id: string) => void, onDelete: (id: string) => void }`

#### 测试
- `components/user/UserTable.test.tsx`
- 场景：正常渲染列表、loading 骨架屏、空列表状态、编辑/删除回调

---

### T9: UserForm 组件

**层级**：前端 UI
**项目**：frontend/gxadmin-console
**依赖**：T2（CreateUserForm/UpdateUserForm 类型）、T3（创建接口）、T5（详情接口）、T6（编辑接口）
**上下文估算**：约 150 行

#### 输入契约
- CreateUserForm / UpdateUserForm 类型（来自 T2）
- userApi.create / userApi.getById / userApi.update 签名（来自 T2）

#### 输出
- `frontend/gxadmin-console/components/user/UserForm.tsx`
- Props：`{ mode: 'create' | 'edit', id?: string, onSuccess: () => void }`

#### 测试
- 场景：创建模式渲染、编辑模式回填、提交 loading、校验错误展示

---

### T10: UserListPage 页面

**层级**：前端 UI
**项目**：frontend/gxadmin-console
**依赖**：T7（useUserList hook）、T8（UserTable）、T9（UserForm）
**上下文估算**：约 100 行

#### 输入契约
- useUserList hook（来自 T7）
- UserTable 组件 Props（来自 T8）
- UserForm 组件 Props（来自 T9）

#### 输出
- `frontend/gxadmin-console/app/users/page.tsx`
- 组合：useUserList + UserTable + UserForm（dialog），管理 page state 和 dialog 开关

#### 测试
- 场景：页面渲染、分页切换、打开创建表单、打开编辑表单

---

## 三、需求覆盖矩阵

| 设计点 | 来源 | 覆盖 Task |
|------|------|------|
| User Entity | design.md §5.1 | T1 |
| CreateUserRequest DTO | design.md §5.2 | T1 |
| User 类型 | design.md §5.3 | T2 |
| User DDL | design.md §5.4 | T1 |
| POST /api/v1/users | api.json | T3 |
| GET /api/v1/users | api.json | T4 |
| GET /api/v1/users/:id | api.json | T5 |
| PUT /api/v1/users/:id | api.json | T6 |
| UserTable 组件 | design.md §3.2 | T8 |
| UserForm 组件 | design.md §3.2 | T9 |
| UserListPage 页面 | design.md §3.3 | T10 |
| CP-001 创建用户 | checkpoint.md | T3, T9 |
| CP-002 用户列表 | checkpoint.md | T4, T7, T8, T10 |
| CP-003 编辑用户 | checkpoint.md | T6, T9 |

---

## 四、执行单元

| 单元ID | 包含 Task | 项目 | 产物目录 | 依赖单元 |
|--------|------|------|------|------|
| U-001 | T1 | api | backend/api/ | - |
| U-002 | T2 | console | frontend/gxadmin-console/ | U-001 |
| U-003 | T3, T4, T5, T6 | api | backend/api/ | U-001 |
| U-004 | T7 | console | frontend/gxadmin-console/ | U-002, U-003 |
| U-005 | T8, T9 | console | frontend/gxadmin-console/ | U-004 |
| U-006 | T10 | console | frontend/gxadmin-console/ | U-005 |

---

## 五、里程碑

- [ ] M1: U-001 完成 → 数据模型就绪
- [ ] M2: U-002 完成 → 前端类型和 API 签名就绪
- [ ] M3: U-003 完成 → 后端 4 个接口全部就绪
- [ ] M4: U-004~U-006 完成 → 前端全部就绪 → 交付
```

---

## 质量标准

- 三层拆分清晰：前置契约 / 业务接口 / 前端 UI
- 业务接口层不拆 handler 和 service（一个接口一个 Task）
- 接口 Task 之间无实现级依赖（只依赖 T1 的 Entity/DTO）
- 每个 Task 有完整的输入/输出契约，输出包含精确的文件路径和函数/类型/组件签名
- 依赖图无循环
- 覆盖矩阵包含所有 api.json 端点、数据库表、前端页面、checkpoint 验收点

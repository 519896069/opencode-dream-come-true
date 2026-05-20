# 阶段二：方案设计

## 阶段产物

| 产物 | 说明 |
|------|------|
| `prd/{YYYY-MM-DD-<英文简述>}/design.md` | 方案设计文档（含逐条确认清单） |
| `prd/{YYYY-MM-DD-<英文简述>}/api.json` | OpenAPI 3.0 接口定义 |
| `prd/{YYYY-MM-DD-<英文简述>}/test-case.md` | 测试用例 |

---

## 产物规范

### design.md 结构

```markdown
# 方案设计: {需求标题}

> 基于 design-analysis.md 生成，设计决策已确认

---

## 一、数据库变更分析

### 1.1 现有表字段变更

| 表名 | 需新增字段 | 需修改字段 | 需新增索引 | 说明 |
|------|------|------|------|------|
| users | avatar_url, last_login_at | - | idx_last_login | 用户头像和最后登录时间 |

### 1.2 新增表

| 表名 | 字段列表 | 索引 | 说明 |
|------|------|------|------|
| user_profiles | user_id, bio, avatar_url | user_id UNIQUE | 用户扩展信息表 |

### 1.3 不涉及的表

{列出扫描后确认不需要修改的表}

### 1.4 数据库确认清单

- [ ] 确认 users 表新增 avatar_url 字段（varchar(500)）
- [ ] 确认 users 表新增 last_login_at 字段（datetime）
- [ ] 确认新建 user_profiles 表
- [ ] 确认不修改 roles 表

---

## 二、后端代码分析

### 2.1 可复用函数

| 函数 | 文件位置 | 当前用途 | 是否需修改 | 修改说明 |
|------|------|------|:--:|------|
| GetUserByID | internal/service/user.go:45 | 按ID查询用户 | 否 | - |
| ValidateRole | internal/middleware/auth.go:120 | 角色校验 | 是 | 需支持新角色 xxx |

### 2.2 需新增函数

| 函数 | 目标文件 | 说明 | 输入 | 输出 |
|------|------|------|------|------|
| UpdateUserProfile | internal/service/user.go | 更新用户扩展信息 | userID, profile | error |
| UploadAvatar | internal/handler/upload.go | 头像上传处理 | multipart file | AvatarURL, error |

### 2.3 API 设计

| Method | Path | Handler | 鉴权 | 说明 |
|--------|------|---------|:--:|------|
| GET | /api/v1/users/:id/profile | GetUserProfile | 是 | 获取用户扩展信息 |
| PUT | /api/v1/users/:id/profile | UpdateUserProfile | 是 | 更新用户扩展信息 |
| POST | /api/v1/users/:id/avatar | UploadAvatar | 是 | 上传头像 |

> 详细参数、请求/响应体、校验规则见 `api.json`

### 2.4 错误码定义

| 错误码 | HTTP 状态码 | 说明 | 场景 |
|--------|:--:|------|------|
| 40401 | 404 | 用户不存在 | 查询/更新时用户ID无效 |
| 40301 | 403 | 无权限编辑他人资料 | 非管理员编辑他人 |

### 2.5 后端确认清单

- [ ] 确认复用 GetUserByID，不做修改
- [ ] 确认复用 ValidateRole，需新增角色 xxx
- [ ] 确认新增 UpdateUserProfile 函数
- [ ] 确认 GET /api/v1/users/:id/profile 接口设计
- [ ] 确认 PUT /api/v1/users/:id/profile 接口设计
- [ ] 确认 POST /api/v1/users/:id/avatar 接口设计

---

## 三、前端代码分析

### 3.1 可复用组件

| 组件 | 文件位置 | 当前用途 | 是否需修改 | 修改说明 |
|------|------|------|:--:|------|
| UserCard | components/user/UserCard.tsx | 用户卡片展示 | 否 | - |
| AvatarUpload | components/common/AvatarUpload.tsx | 头像上传组件 | 否 | - |
| useUser | hooks/useUser.ts | 用户数据 hook | 是 | 需扩展 profile 字段 |

### 3.2 需新增组件

| 组件 | 目标文件 | Props | 说明 |
|------|------|------|------|
| UserProfilePage | app/users/[id]/profile/page.tsx | { params: { id: string } } | 用户详情页 |
| ProfileForm | components/user/ProfileForm.tsx | { profile: UserProfile, onSubmit } | 编辑表单 |

### 3.3 路由设计

| 路由 | 页面组件 | 布局 | 鉴权 |
|------|------|------|:--:|
| /users/:id/profile | UserProfilePage | main | 是 |
| /users/:id/profile/edit | ProfileForm | main | 是 |

### 3.4 前端确认清单

- [ ] 确认复用 AvatarUpload 组件
- [ ] 确认复用 UserCard 组件
- [ ] 确认 useUser hook 需扩展 profile 字段
- [ ] 确认新增 UserProfilePage 页面
- [ ] 确认 /users/:id/profile 路由设计
- [ ] 确认 /users/:id/profile/edit 路由设计

---

## 四、边界条件与错误处理

| 场景 | 前端行为 | 后端行为 | HTTP 状态码 |
|------|------|------|:--:|
| 字段为空 | 红色提示"必填" | 返回字段级错误 | 400 |
| 用户不存在 | 显示"用户不存在" | 返回错误 | 404 |
| 无权限编辑他人 | 隐藏编辑按钮 | 返回权限错误 | 403 |
| 头像上传超大 | 前端限制 2MB，提示 | 后端二次校验 | 413 |
| 并发编辑 | 提交时版本号比对 | 乐观锁校验 | 409 |
| 超长输入 | 前端限制 + 提示 | 后端校验截断 | 400 |

### 确认清单

- [ ] 确认头像上传大小限制 2MB
- [ ] 确认并发编辑使用乐观锁
- [ ] 确认 bio 字段最大 500 字符

---

## 五、设计决策

> 基于 design-analysis.md § 四 的设计决策点，决策结果已确认

### 5.1 {决策主题1}

**决策结果**：✅ 已选择：选项 B - {选项B名称}

- 说明：{选项B说明}
- 优点：{选项B优点}
- 决策时间：{时间}

### 5.2 {决策主题2}

**决策结果**：✅ 已选择：选项 A - {选项A名称}

- 说明：{选项A说明}
- 优点：{选项A优点}
- 决策时间：{时间}

### 5.3 {决策主题3}

**决策结果**：✅ 已选择：选项 B - {选项B名称}

- 说明：{选项B说明}
- 优点：{选项B优点}
- 决策时间：{时间}

---

## 六、契约层代码

### 6.1 Entity

```go
// internal/model/user.go

type User struct {
    Id          uint64    `gorm:"column:id;primaryKey" json:"id,string"`
    Name        string    `gorm:"column:name;size:50" json:"name"`
    AvatarUrl   string    `gorm:"column:avatar_url;size:500" json:"avatar_url"`
    LastLoginAt time.Time `gorm:"column:last_login_at" json:"last_login_at,omitempty"`
    CreatedAt   time.Time `gorm:"column:created_at" json:"created_at"`
    UpdatedAt   time.Time `gorm:"column:updated_at" json:"updated_at"`
}
```

### 6.2 DTO

```go
// internal/dto/user.go

type UpdateProfileRequest struct {
    Bio       string `json:"bio" binding:"max=500"`
    AvatarUrl string `json:"avatar_url" binding:"omitempty,url,max=500"`
}

type UserProfileResponse struct {
    Id        uint64 `json:"id,string"`
    Name      string `json:"name"`
    Bio       string `json:"bio"`
    AvatarUrl string `json:"avatar_url"`
}
```

### 6.3 TypeScript 类型

```typescript
// types/user.ts

export interface UserProfile {
  id: string
  name: string
  bio: string
  avatar_url: string
}

export interface UpdateProfileForm {
  bio: string
  avatar_url: string
}
```

### 6.4 SQL DDL

```sql
-- 变更
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) DEFAULT '' AFTER name;
ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL AFTER avatar_url;

-- 新表
CREATE TABLE user_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    bio VARCHAR(500) DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 七、确认结论

- [ ] 数据库变更方案确认
- [ ] 后端复用/新增方案确认
- [ ] 前端复用/新增方案确认
- [ ] API 设计确认
- [ ] 设计决策确认
- [ ] 边界条件处理方案确认
```

---

## 质量标准

- 所有数据库变更结论必须有 vs 真实表的对比依据
- 所有"可复用"结论必须标注文件路径和行号
- 每一节都有可勾选的确认清单
- 契约层代码可直接复制粘贴使用
- Entity tag 与数据库字段一一对应
- DTO binding tag 包含校验规则
- 不包含 Controller/Service/JSX 实现代码
- 设计决策必须基于 design-analysis.md 中的用户决策结果
- 设计决策必须包含：选项名称、说明、优点、决策时间

# 前端 E2E 测试指引

## 框架

使用 [Playwright](https://playwright.dev/)，Next.js 官方推荐的 E2E 测试框架。

## 文件命名与位置

```
frontend/gxadmin-console/e2e/{page-name}.spec.ts
```

## 基础配置

`playwright.config.ts`（如果项目尚未配置）：

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
})
```

## 用户路径测试模板

```typescript
import { test, expect } from '@playwright/test'

test.describe('用户列表页', () => {
  test.beforeEach(async ({ page }) => {
    // 登录（使用测试账号）
    await page.goto('/login')
    await page.fill('[name="username"]', 'test@example.com')
    await page.fill('[name="password"]', 'test123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('打开列表 → 翻页 → 搜索 → 查看详情', async ({ page }) => {
    // 导航到列表页
    await page.goto('/users')
    await expect(page.locator('h1')).toContainText('用户管理')

    // 等待数据加载
    await expect(page.locator('[data-testid="user-table"] tbody tr').first()).toBeVisible()

    // 验证表格有数据
    const rows = page.locator('[data-testid="user-table"] tbody tr')
    await expect(rows).not.toHaveCount(0)

    // 搜索
    await page.fill('[data-testid="search-input"]', '张三')
    await page.click('[data-testid="search-btn"]')
    await expect(rows.first()).toContainText('张三')

    // 点击查看详情
    await rows.first().click()
    await page.waitForURL(/\/users\/\d+/)
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible()
  })

  test('创建用户 → 填写表单 → 提交 → 回到列表', async ({ page }) => {
    await page.goto('/users')
    await page.click('[data-testid="create-btn"]')

    // 表单出现
    await expect(page.locator('[data-testid="user-form"]')).toBeVisible()

    // 填写表单
    await page.fill('[name="name"]', 'E2E测试用户')
    await page.fill('[name="avatar_url"]', 'https://example.com/e2e.png')

    // 提交
    await page.click('[data-testid="submit-btn"]')

    // 验证成功提示
    await expect(page.locator('.toast-success')).toContainText('创建成功')

    // 回到列表
    await page.waitForURL('/users')
  })
})
```

## UI 三态检查

每个需要异步数据的页面/组件，必须测试三种状态：

```typescript
test('列表 loading 状态', async ({ page }) => {
  // 拦截 API，延迟响应
  await page.route('**/api/v1/users**', async (route) => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    await route.continue()
  })
  await page.goto('/users')
  // 骨架屏或 spinner 出现
  await expect(page.locator('[data-testid="loading-skeleton"]')).toBeVisible()
})

test('列表空状态', async ({ page }) => {
  // Mock 空数据
  await page.route('**/api/v1/users**', (route) =>
    route.fulfill({ body: JSON.stringify({ list: [], total: 0 }) })
  )
  await page.goto('/users')
  await expect(page.locator('[data-testid="empty-state"]')).toContainText('暂无数据')
})

test('列表错误状态', async ({ page }) => {
  // Mock 服务器错误
  await page.route('**/api/v1/users**', (route) =>
    route.fulfill({ status: 500 })
  )
  await page.goto('/users')
  await expect(page.locator('[data-testid="error-state"]')).toBeVisible()
  // 重试按钮
  await page.click('[data-testid="retry-btn"]')
})
```

## 表单交互测试

```typescript
test('表单校验 → 错误提示 → 修正 → 提交', async ({ page }) => {
  await page.goto('/users')
  await page.click('[data-testid="create-btn"]')

  // 空表单提交 → 校验错误
  await page.click('[data-testid="submit-btn"]')
  await expect(page.locator('[data-testid="name-error"]')).toContainText('请输入名称')

  // 超长输入 → 校验错误
  await page.fill('[name="name"]', 'a'.repeat(100))
  await page.click('[data-testid="submit-btn"]')
  await expect(page.locator('[data-testid="name-error"]')).toContainText('最多50')

  // 修正 → 提交成功
  await page.fill('[name="name"]', '合法名称')
  await page.click('[data-testid="submit-btn"]')
  await expect(page.locator('.toast-success')).toBeVisible()
})

test('提交按钮 loading 态防重复点击', async ({ page }) => {
  await page.goto('/users')
  await page.click('[data-testid="create-btn"]')

  await page.fill('[name="name"]', '测试')
  await page.click('[data-testid="submit-btn"]')

  // 提交中按钮 disabled
  await expect(page.locator('[data-testid="submit-btn"]')).toBeDisabled()
  // 有 loading 动画
  await expect(page.locator('[data-testid="submit-btn"] .spinner')).toBeVisible()
})
```

## 测试覆盖的用户路径

根据 checkpoint.md 中定义的验收场景，每个场景至少 1 个 E2E 用例：

| 场景 | 覆盖内容 |
|------|------|
| 列表查看 | 加载 → 渲染 → 分页 → 搜索 → 排序 |
| 创建 | 打开表单 → 填写 → 校验 → 提交 → 反馈 |
| 编辑 | 列表→点击编辑→回填→修改→保存→刷新 |
| 删除 | 列表→点击删除→确认弹窗→确认→列表刷新 |
| 详情 | 列表→点击→详情页→返回 |
| 异常 | 网络错误→错误提示→重试 |

## 运行命令

```bash
# 启动开发服务器后运行
npx playwright test

# 指定文件
npx playwright test e2e/users.spec.ts

# 带 UI 模式（调试用）
npx playwright test --ui

# 生成测试报告
npx playwright show-report
```

## data-testid 约定

组件需要添加 `data-testid` 属性以便 E2E 测试定位，不受样式/文案变更影响：

```tsx
// 表格
<table data-testid="user-table">
  <tr data-testid="user-row-{id}">

// 按钮
<button data-testid="create-btn">创建用户</button>
<button data-testid="submit-btn">提交</button>
<button data-testid="delete-btn-{id}">删除</button>

// 状态
<div data-testid="loading-skeleton" />
<div data-testid="empty-state">暂无数据</div>
<div data-testid="error-state">加载失败</div>

// 表单
<form data-testid="user-form">
<input name="name" data-testid="name-input" />
<span data-testid="name-error">错误提示</span>

// 搜索
<input data-testid="search-input" />
<button data-testid="search-btn">搜索</button>
```

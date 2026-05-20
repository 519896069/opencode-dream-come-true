# Go 集成测试指引

## 文件命名与位置

```
backend/api/internal/handler/{resource}_integration_test.go
```

与 handler 单元测试文件同目录，`_integration_test.go` 后缀区分。

## 测试路由搭建

```go
package handler

import (
    "net/http/httptest"
    "testing"
)

func setupTestRouter(t *testing.T) (*gin.Engine, *gorm.DB) {
    gin.SetMode(gin.TestMode)
    router := gin.New()

    // 连接测试数据库
    dsn := os.Getenv("TEST_DB_DSN")
    if dsn == "" {
        t.Skip("TEST_DB_DSN not set, skipping integration test")
    }
    db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
    require.NoError(t, err)

    // 注入中间件和路由（与 main.go 一致）
    router.Use(middleware.AuthMiddleware(db))
    RegisterRoutes(router, db)

    return router, db
}
```

## 事务隔离

每个测试用例使用事务回滚，保证测试间数据隔离：

```go
func TestCreateUser_Integration(t *testing.T) {
    router, db := setupTestRouter(t)

    // 开启事务
    tx := db.Begin()
    defer tx.Rollback()

    // 准备请求
    body := `{"name":"测试用户","avatar_url":"https://example.com/avatar.png"}`
    req := httptest.NewRequest("POST", "/api/v1/users", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+testToken)

    // 执行请求
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    // 断言 HTTP 状态码
    assert.Equal(t, 200, w.Code)

    // 断言响应 JSON
    var resp map[string]interface{}
    json.Unmarshal(w.Body.Bytes(), &resp)
    assert.NotEmpty(t, resp["id"])

    // 断言数据库写入正确
    var user model.User
    err := tx.Where("name = ?", "测试用户").First(&user).Error
    assert.NoError(t, err)
    assert.Equal(t, 1, user.Status)
}
```

## 表驱动测试模板

```go
func TestUserAPI_Integration(t *testing.T) {
    router, db := setupTestRouter(t)

    tests := []struct {
        name           string
        method         string
        path           string
        body           string
        expectedStatus int
        checkDB        func(*gorm.DB) error
    }{
        {
            name:           "正常创建用户",
            method:         "POST",
            path:           "/api/v1/users",
            body:           `{"name":"张三","avatar_url":"http://a.jpg"}`,
            expectedStatus: 200,
            checkDB: func(tx *gorm.DB) error {
                var u model.User
                return tx.Where("name = ?", "张三").First(&u).Error
            },
        },
        {
            name:           "缺少必填字段",
            method:         "POST",
            path:           "/api/v1/users",
            body:           `{}`,
            expectedStatus: 400,
            checkDB:        nil,
        },
        {
            name:           "未认证",
            method:         "GET",
            path:           "/api/v1/users",
            body:           "",
            expectedStatus: 401,
            checkDB:        nil,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            tx := db.Begin()
            defer tx.Rollback()

            req := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
            req.Header.Set("Content-Type", "application/json")
            if tt.name != "未认证" {
                req.Header.Set("Authorization", "Bearer "+testToken)
            }

            w := httptest.NewRecorder()
            router.ServeHTTP(w, req)

            assert.Equal(t, tt.expectedStatus, w.Code)

            if tt.checkDB != nil {
                assert.NoError(t, tt.checkDB(tx))
            }
        })
    }
}
```

## 测试覆盖场景

每个 API 端点至少覆盖：

| 场景 | 说明 |
|------|------|
| 正常请求 | 合法输入 → 200/201 + 正确响应 |
| 参数校验 | 缺少必填/格式错误/超长 → 400 |
| 认证 | 无 Token / 过期 Token → 401 |
| 权限 | 无权限用户 → 403 |
| 资源不存在 | GET/PUT/DELETE 不存在的 ID → 404 |
| 业务冲突 | 重复创建/状态不允许操作 → 409/422 |
| 服务器错误 | 模拟 DB 断开 → 500 |

## 数据库验证要点

- **POST**：确认新记录写入，字段值与请求一致，默认值正确
- **PUT**：确认旧值被更新，未传字段不受影响
- **DELETE**：确认记录被删除或软删除标记正确
- **GET 列表**：确认返回数量、排序、筛选正确

## 运行命令

```bash
# 仅集成测试
cd backend/api && go test -gcflags=all=-l -v -cover -tags=integration ./internal/handler/...

# 全部测试（含单元测试）
cd backend/api && go test -gcflags=all=-l -v -cover -tags=integration ./...
```

需要在 CI 或本地设置环境变量 `TEST_DB_DSN`，未设置时测试自动 Skip。

# PHP 集成测试指引

> 适用于 `backend/gongxinphp/`（Laravel 项目，旧项目维护中）。仅在需求涉及 PHP 后端时加载。

## 文件命名与位置

```
backend/gongxinphp/tests/Feature/{Resource}IntegrationTest.php
```

## 测试基础类

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserIntegrationTest extends TestCase
{
    use RefreshDatabase; // 每个测试自动回滚事务

    protected function setUp(): void
    {
        parent::setUp();
        // 可选：seed 基础数据
        $this->seed(TestDatabaseSeeder::class);
    }

    public function test_create_user()
    {
        $response = $this->postJson('/api/v1/users', [
            'name' => '测试用户',
            'avatar_url' => 'https://example.com/avatar.png',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['id']);

        // 验证数据库
        $this->assertDatabaseHas('users', [
            'name' => '测试用户',
            'status' => 1,
        ]);
    }
}
```

## 表驱动测试

```php
public function user_api_provider(): array
{
    return [
        '正常创建' => [
            'method' => 'POST',
            'uri' => '/api/v1/users',
            'data' => ['name' => '张三'],
            'expectedStatus' => 200,
            'assertDb' => ['users', ['name' => '张三']],
        ],
        '缺少名称' => [
            'method' => 'POST',
            'uri' => '/api/v1/users',
            'data' => [],
            'expectedStatus' => 400,
            'assertDb' => null,
        ],
        '未认证' => [
            'method' => 'GET',
            'uri' => '/api/v1/users',
            'data' => [],
            'expectedStatus' => 401,
            'assertDb' => null,
            'skipAuth' => true,
        ],
    ];
}

/**
 * @dataProvider user_api_provider
 */
public function test_user_api($method, $uri, $data, $expectedStatus, $assertDb, $skipAuth = false)
{
    $request = $skipAuth
        ? $this->json($method, $uri, $data)
        : $this->actingAs($this->testUser)->json($method, $uri, $data);

    $request->assertStatus($expectedStatus);

    if ($assertDb) {
        [$table, $conditions] = $assertDb;
        $this->assertDatabaseHas($table, $conditions);
    }
}
```

## 测试覆盖场景

| 场景 | 说明 |
|------|------|
| 正常请求 | 合法输入 → 200/201 + 正确响应 |
| 参数校验 | 缺少必填/格式错误/超长 → 422 |
| 认证 | 无 Token → 401 |
| 权限 | 无权限用户 → 403 |
| 资源不存在 | GET/PUT/DELETE 不存在的 ID → 404 |

## 运行命令

```bash
cd backend/gongxinphp && php artisan test --filter=Integration
```

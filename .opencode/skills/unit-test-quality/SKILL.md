# 单元测试质量规范

## 触发时机

生成单元测试代码时触发。确保测试有意义，不是 `a = a` 的无效断言。

## 文件映射

| 文件 | 用途 |
|------|------|
| `reference/go-examples.md` | Go 测试示例：Service/Handler/GORM Mock |
| `reference/frontend-examples.md` | 前端测试示例：组件/Hook/Store/API |

**生成测试代码时，必须读取对应语言的示例文件。**

## 核心规则

### 1. 测试必须验证行为，不是赋值

- ✅ 调用被测函数，验证返回值或副作用
- ❌ 禁止 `a = a` 的无意义断言

### 2. 测试必须 Mock 外部依赖

- 数据库操作必须 Mock
- 外部 API 调用必须 Mock
- 文件系统操作必须 Mock
- 时间相关操作必须 Mock

### 3. 测试必须覆盖真实场景

每个测试用例必须包含：
1. **Arrange（准备）**：设置测试数据和 Mock
2. **Act（执行）**：调用被测函数
3. **Assert（断言）**：验证返回值和副作用

### 4. 测试覆盖要求

- 正常流程测试
- 错误处理测试
- 边界条件测试
- 参数校验测试

## 禁止的测试模式

| 类型 | 示例 | 为什么禁止 |
|------|------|-----------|
| 验证赋值 | `x := 1; assert.Equal(t, 1, x)` | 只是 `a = a` |
| 验证类型 | `var x int; assert.IsType(t, 0, x)` | 无意义 |
| 验证 nil 初始值 | `var x *User; assert.Nil(t, x)` | 无意义 |
| 不调用被测函数 | 只验证构造的数据 | 没有测试任何逻辑 |
| 验证 props 赋值 | `render(<Comp name="test" />)` | 前端的 `a = a` |
| 验证静态文本 | `expect(screen.getByText('标题'))` | 无逻辑可测 |
| 验证初始状态 | `expect(result.current.user).toBeNull()` | 无意义 |

## 命名规范

```
Test<函数名>_<场景>
```

示例：`TestCreateUser_Success`、`TestCreateUser_DatabaseError`、`TestGetUser_NotFound`

## 验证清单

生成测试代码后，检查：

- [ ] 每个测试都调用了被测函数
- [ ] 每个测试都 Mock 了外部依赖
- [ ] 每个测试都验证了返回值或副作用
- [ ] 没有 `a = a` 的无意义断言
- [ ] 覆盖了正常流程、错误处理、边界条件
- [ ] 测试名称清晰描述场景

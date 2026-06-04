# 单元测试质量规范

## 触发时机

生成单元测试代码时触发。确保测试有意义，不是 `a = a` 的无效断言。

## 核心原则

### 1. 测试必须验证行为，不是赋值

**❌ 错误示例（无意义）：**
```go
func TestCreateUser_Success(t *testing.T) {
    name := "test"
    assert.Equal(t, "test", name)  // 只是验证赋值，毫无意义
}
```

**✅ 正确示例（有意义）：**
```go
func TestCreateUser_Success(t *testing.T) {
    // Mock 数据库
    dbMock := new(DBMock)
    dbMock.On("Create", mock.Anything).Return(nil)
    
    // 调用被测函数
    err := CreateUser(dbMock, "test", "test@example.com")
    
    // 验证行为
    assert.NoError(t, err)
    dbMock.AssertExpectations(t)
}
```

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

## 测试用例设计规范

### 正常流程测试

```go
func TestFunctionName_Success(t *testing.T) {
    // Arrange
    input := validInput
    mockDep := new(MockDep)
    mockDep.On("Method", expectedArgs).Return(expectedResult, nil)
    
    // Act
    result, err := FunctionName(mockDep, input)
    
    // Assert
    assert.NoError(t, err)
    assert.Equal(t, expectedResult, result)
    mockDep.AssertExpectations(t)
}
```

### 错误处理测试

```go
func TestFunctionName_DatabaseError(t *testing.T) {
    // Arrange
    input := validInput
    mockDep := new(MockDep)
    mockDep.On("Method", expectedArgs).Return(nil, errors.New("db error"))
    
    // Act
    result, err := FunctionName(mockDep, input)
    
    // Assert
    assert.Error(t, err)
    assert.Nil(t, result)
    assert.Contains(t, err.Error(), "db error")
}
```

### 边界条件测试

```go
func TestFunctionName_EmptyInput(t *testing.T) {
    // Arrange
    input := ""
    
    // Act
    result, err := FunctionName(nil, input)
    
    // Assert
    assert.Error(t, err)
    assert.Nil(t, result)
}

func TestFunctionName_NilInput(t *testing.T) {
    // Arrange
    var input *Type
    
    // Act
    result, err := FunctionName(nil, input)
    
    // Assert
    assert.Error(t, err)
    assert.Nil(t, result)
}
```

### 参数校验测试

```go
func TestFunctionName_InvalidInput(t *testing.T) {
    // Arrange
    input := invalidInput  // 缺少必填字段
    
    // Act
    result, err := FunctionName(nil, input)
    
    // Assert
    assert.Error(t, err)
    assert.Nil(t, result)
}
```

## Mock 规范

### Go 项目 Mock 方式

#### 1. 使用 gomonkey（推荐）

```go
func TestGetUser_Success(t *testing.T) {
    // Mock 数据库函数
    patch := gomonkey.ApplyFunc(db.ShareOnionDb, func() *gorm.DB {
        return mockDB
    })
    defer patch.Reset()
    
    // Mock GORM 链式调用
    patch.ApplyMethod(reflect.TypeOf(&gorm.DB{}), "Where", func(_ *gorm.DB, _ interface{}, _ ...interface{}) *gorm.DB {
        return mockDB
    })
    
    // 调用被测函数
    user, err := GetUser(1)
    
    // 验证
    assert.NoError(t, err)
    assert.NotNil(t, user)
}
```

#### 2. 使用接口 Mock

```go
// 定义接口
type UserRepository interface {
    FindByID(id int64) (*User, error)
    Create(user *User) error
}

// Mock 实现
type MockUserRepository struct {
    mock.Mock
}

func (m *MockUserRepository) FindByID(id int64) (*User, error) {
    args := m.Called(id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*User), args.Error(1)
}

func (m *MockUserRepository) Create(user *User) error {
    args := m.Called(user)
    return args.Error(0)
}

// 测试
func TestUserService_CreateUser_Success(t *testing.T) {
    // Arrange
    mockRepo := new(MockUserRepository)
    mockRepo.On("FindByEmail", "test@example.com").Return(nil, nil)
    mockRepo.On("Create", mock.Anything).Return(nil)
    
    service := NewUserService(mockRepo)
    
    // Act
    err := service.CreateUser("test", "test@example.com")
    
    // Assert
    assert.NoError(t, err)
    mockRepo.AssertExpectations(t)
}
```

## 禁止的测试模式

### ❌ 禁止：验证赋值

```go
// 禁止这种测试
func TestXxx(t *testing.T) {
    x := 1
    assert.Equal(t, 1, x)  // 无意义
}
```

### ❌ 禁止：验证类型

```go
// 禁止这种测试
func TestXxx(t *testing.T) {
    var x int
    assert.IsType(t, 0, x)  // 无意义
}
```

### ❌ 禁止：验证 nil 初始值

```go
// 禁止这种测试
func TestXxx(t *testing.T) {
    var x *User
    assert.Nil(t, x)  // 无意义
}
```

### ❌ 禁止：不调用被测函数

```go
// 禁止这种测试
func TestCreateUser_Success(t *testing.T) {
    user := &User{Name: "test"}
    assert.Equal(t, "test", user.Name)  // 没有调用 CreateUser
}
```

## 测试文件结构

```
handler/
├── user.go
├── user_test.go      # 测试文件
└── mock_test.go      # Mock 定义（可选）
```

## 测试命名规范

```
Test<函数名>_<场景>
```

示例：
- `TestCreateUser_Success`
- `TestCreateUser_DatabaseError`
- `TestCreateUser_EmptyName`
- `TestGetUser_NotFound`
- `TestBatchCreateUsers_EmptyList`

## 验证清单

生成测试代码后，检查：

- [ ] 每个测试都调用了被测函数
- [ ] 每个测试都 Mock 了外部依赖
- [ ] 每个测试都验证了返回值或副作用
- [ ] 没有 `a = a` 的无意义断言
- [ ] 覆盖了正常流程、错误处理、边界条件
- [ ] 测试名称清晰描述场景

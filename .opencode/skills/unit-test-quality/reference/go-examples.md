# Go 单元测试示例

## 完整示例：Service 层测试

### 被测代码

```go
// user_service.go
package service

type UserService struct {
    repo UserRepository
    mail MailService
}

func (s *UserService) CreateUser(name, email string) (*User, error) {
    // 参数校验
    if name == "" {
        return nil, errors.New("name is required")
    }
    if email == "" {
        return nil, errors.New("email is required")
    }
    
    // 检查邮箱是否已存在
    existing, err := s.repo.FindByEmail(email)
    if err != nil {
        return nil, fmt.Errorf("failed to check email: %w", err)
    }
    if existing != nil {
        return nil, errors.New("email already exists")
    }
    
    // 创建用户
    user := &User{Name: name, Email: email}
    if err := s.repo.Create(user); err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }
    
    // 发送欢迎邮件
    if err := s.mail.SendWelcome(email); err != nil {
        // 邮件失败不影响用户创建，只记录日志
        log.Printf("failed to send welcome email: %v", err)
    }
    
    return user, nil
}
```

### 测试代码

```go
// user_service_test.go
package service

import (
    "errors"
    "testing"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

// Mock UserRepository
type MockUserRepository struct {
    mock.Mock
}

func (m *MockUserRepository) FindByEmail(email string) (*User, error) {
    args := m.Called(email)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*User), args.Error(1)
}

func (m *MockUserRepository) Create(user *User) error {
    args := m.Called(user)
    return args.Error(0)
}

// Mock MailService
type MockMailService struct {
    mock.Mock
}

func (m *MockMailService) SendWelcome(email string) error {
    args := m.Called(email)
    return args.Error(0)
}

// ==================== 测试用例 ====================

func TestCreateUser_Success(t *testing.T) {
    // Arrange
    mockRepo := new(MockUserRepository)
    mockMail := new(MockMailService)
    
    mockRepo.On("FindByEmail", "test@example.com").Return(nil, nil)
    mockRepo.On("Create", mock.AnythingOfType("*service.User")).Return(nil)
    mockMail.On("SendWelcome", "test@example.com").Return(nil)
    
    service := NewUserService(mockRepo, mockMail)
    
    // Act
    user, err := service.CreateUser("test", "test@example.com")
    
    // Assert
    assert.NoError(t, err)
    assert.NotNil(t, user)
    assert.Equal(t, "test", user.Name)
    assert.Equal(t, "test@example.com", user.Email)
    
    mockRepo.AssertExpectations(t)
    mockMail.AssertExpectations(t)
}

func TestCreateUser_EmptyName(t *testing.T) {
    // Arrange
    mockRepo := new(MockUserRepository)
    mockMail := new(MockMailService)
    service := NewUserService(mockRepo, mockMail)
    
    // Act
    user, err := service.CreateUser("", "test@example.com")
    
    // Assert
    assert.Error(t, err)
    assert.Nil(t, user)
    assert.Contains(t, err.Error(), "name is required")
    
    // 验证没有调用 repo
    mockRepo.AssertNotCalled(t, "FindByEmail")
    mockRepo.AssertNotCalled(t, "Create")
}

func TestCreateUser_EmptyEmail(t *testing.T) {
    // Arrange
    mockRepo := new(MockUserRepository)
    mockMail := new(MockMailService)
    service := NewUserService(mockRepo, mockMail)
    
    // Act
    user, err := service.CreateUser("test", "")
    
    // Assert
    assert.Error(t, err)
    assert.Nil(t, user)
    assert.Contains(t, err.Error(), "email is required")
}

func TestCreateUser_EmailAlreadyExists(t *testing.T) {
    // Arrange
    mockRepo := new(MockUserRepository)
    mockMail := new(MockMailService)
    
    existingUser := &User{ID: 1, Name: "existing", Email: "test@example.com"}
    mockRepo.On("FindByEmail", "test@example.com").Return(existingUser, nil)
    
    service := NewUserService(mockRepo, mockMail)
    
    // Act
    user, err := service.CreateUser("test", "test@example.com")
    
    // Assert
    assert.Error(t, err)
    assert.Nil(t, user)
    assert.Contains(t, err.Error(), "email already exists")
    
    // 验证没有调用 Create
    mockRepo.AssertNotCalled(t, "Create")
}

func TestCreateUser_DatabaseErrorOnCheck(t *testing.T) {
    // Arrange
    mockRepo := new(MockUserRepository)
    mockMail := new(MockMailService)
    
    mockRepo.On("FindByEmail", "test@example.com").Return(nil, errors.New("connection refused"))
    
    service := NewUserService(mockRepo, mockMail)
    
    // Act
    user, err := service.CreateUser("test", "test@example.com")
    
    // Assert
    assert.Error(t, err)
    assert.Nil(t, user)
    assert.Contains(t, err.Error(), "failed to check email")
}

func TestCreateUser_DatabaseErrorOnCreate(t *testing.T) {
    // Arrange
    mockRepo := new(MockUserRepository)
    mockMail := new(MockMailService)
    
    mockRepo.On("FindByEmail", "test@example.com").Return(nil, nil)
    mockRepo.On("Create", mock.Anything).Return(errors.New("disk full"))
    
    service := NewUserService(mockRepo, mockMail)
    
    // Act
    user, err := service.CreateUser("test", "test@example.com")
    
    // Assert
    assert.Error(t, err)
    assert.Nil(t, user)
    assert.Contains(t, err.Error(), "failed to create user")
}

func TestCreateUser_MailErrorIgnored(t *testing.T) {
    // Arrange
    mockRepo := new(MockUserRepository)
    mockMail := new(MockMailService)
    
    mockRepo.On("FindByEmail", "test@example.com").Return(nil, nil)
    mockRepo.On("Create", mock.Anything).Return(nil)
    mockMail.On("SendWelcome", "test@example.com").Return(errors.New("smtp error"))
    
    service := NewUserService(mockRepo, mockMail)
    
    // Act
    user, err := service.CreateUser("test", "test@example.com")
    
    // Assert - 邮件失败不影响用户创建
    assert.NoError(t, err)
    assert.NotNil(t, user)
    assert.Equal(t, "test", user.Name)
}
```

## 完整示例：Handler 层测试

### 被测代码

```go
// user_handler.go
package handler

type UserHandler struct {
    service *service.UserService
}

func (h *UserHandler) CreateUser(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "invalid request"})
        return
    }
    
    user, err := h.service.CreateUser(req.Name, req.Email)
    if err != nil {
        if err.Error() == "email already exists" {
            c.JSON(409, gin.H{"error": err.Error()})
            return
        }
        c.JSON(500, gin.H{"error": "internal error"})
        return
    }
    
    c.JSON(201, user)
}
```

### 测试代码

```go
// user_handler_test.go
package handler

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    
    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

func TestCreateHandler_Success(t *testing.T) {
    // Arrange
    mockService := new(MockUserService)
    mockService.On("CreateUser", "test", "test@example.com").Return(
        &User{ID: 1, Name: "test", Email: "test@example.com"}, nil,
    )
    
    handler := NewUserHandler(mockService)
    
    body := CreateUserRequest{Name: "test", Email: "test@example.com"}
    bodyBytes, _ := json.Marshal(body)
    
    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)
    c.Request = httptest.NewRequest("POST", "/users", bytes.NewReader(bodyBytes))
    c.Request.Header.Set("Content-Type", "application/json")
    
    // Act
    handler.CreateUser(c)
    
    // Assert
    assert.Equal(t, 201, w.Code)
    
    var response User
    json.Unmarshal(w.Body.Bytes(), &response)
    assert.Equal(t, "test", response.Name)
    assert.Equal(t, "test@example.com", response.Email)
    
    mockService.AssertExpectations(t)
}

func TestCreateHandler_InvalidRequest(t *testing.T) {
    // Arrange
    mockService := new(MockUserService)
    handler := NewUserHandler(mockService)
    
    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)
    c.Request = httptest.NewRequest("POST", "/users", bytes.NewReader([]byte("invalid")))
    c.Request.Header.Set("Content-Type", "application/json")
    
    // Act
    handler.CreateUser(c)
    
    // Assert
    assert.Equal(t, 400, w.Code)
    mockService.AssertNotCalled(t, "CreateUser")
}

func TestCreateHandler_EmailAlreadyExists(t *testing.T) {
    // Arrange
    mockService := new(MockUserService)
    mockService.On("CreateUser", "test", "test@example.com").Return(
        nil, errors.New("email already exists"),
    )
    
    handler := NewUserHandler(mockService)
    
    body := CreateUserRequest{Name: "test", Email: "test@example.com"}
    bodyBytes, _ := json.Marshal(body)
    
    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)
    c.Request = httptest.NewRequest("POST", "/users", bytes.NewReader(bodyBytes))
    c.Request.Header.Set("Content-Type", "application/json")
    
    // Act
    handler.CreateUser(c)
    
    // Assert
    assert.Equal(t, 409, w.Code)
    assert.Contains(t, w.Body.String(), "email already exists")
}
```

## GORM Mock 示例

```go
func TestGetUser_Success(t *testing.T) {
    // 使用 gomonkey mock GORM
    patch := gomonkey.ApplyFunc(db.ShareOnionDb, func() *gorm.DB {
        return &gorm.DB{}
    })
    defer patch.Reset()
    
    // Mock First 方法
    patch.ApplyMethod(reflect.TypeOf(&gorm.DB{}), "First", func(_ *gorm.DB, dest interface{}, conds ...interface{}) *gorm.DB {
        // 填充返回数据
        user := dest.(*User)
        user.ID = 1
        user.Name = "test"
        return &gorm.DB{Error: nil}
    })
    
    // 调用被测函数
    user, err := GetUser(1)
    
    // 验证
    assert.NoError(t, err)
    assert.NotNil(t, user)
    assert.Equal(t, int64(1), user.ID)
    assert.Equal(t, "test", user.Name)
}
```

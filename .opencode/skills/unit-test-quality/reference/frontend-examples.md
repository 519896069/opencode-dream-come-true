# 前端单元测试示例

## React + Vitest 示例

### 组件测试

```tsx
// UserCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import UserCard from './UserCard'

describe('UserCard', () => {
  const mockUser = {
    id: 1,
    name: '张三',
    email: 'zhangsan@example.com',
    role: 'admin'
  }

  it('点击编辑按钮触发 onEdit', () => {
    const onEdit = vi.fn()
    render(<UserCard user={mockUser} onEdit={onEdit} />)
    
    fireEvent.click(screen.getByText('编辑'))
    
    expect(onEdit).toHaveBeenCalledWith(mockUser)
  })

  it('admin 角色显示管理员标签', () => {
    render(<UserCard user={mockUser} />)
    
    expect(screen.getByText('管理员')).toBeInTheDocument()
  })

  it('非 admin 角色不显示管理员标签', () => {
    const normalUser = { ...mockUser, role: 'user' }
    render(<UserCard user={normalUser} />)
    
    expect(screen.queryByText('管理员')).not.toBeInTheDocument()
  })

  it('删除时弹出确认框', () => {
    const onDelete = vi.fn()
    window.confirm = vi.fn(() => true)
    
    render(<UserCard user={mockUser} onDelete={onDelete} />)
    fireEvent.click(screen.getByText('删除'))
    
    expect(window.confirm).toHaveBeenCalledWith('确定删除该用户吗？')
    expect(onDelete).toHaveBeenCalledWith(mockUser.id)
  })

  it('确认框取消时不触发 onDelete', () => {
    const onDelete = vi.fn()
    window.confirm = vi.fn(() => false)
    
    render(<UserCard user={mockUser} onDelete={onDelete} />)
    fireEvent.click(screen.getByText('删除'))
    
    expect(onDelete).not.toHaveBeenCalled()
  })
})
```

### 表单测试

```tsx
// LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import LoginForm from './LoginForm'

describe('LoginForm', () => {
  it('表单验证：用户名为空时显示错误', async () => {
    render(<LoginForm onSubmit={vi.fn()} />)
    
    fireEvent.click(screen.getByText('登录'))
    
    await waitFor(() => {
      expect(screen.getByText('请输入用户名')).toBeInTheDocument()
    })
  })

  it('表单验证：密码少于6位显示错误', async () => {
    render(<LoginForm onSubmit={vi.fn()} />)
    
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: '123' } })
    fireEvent.click(screen.getByText('登录'))
    
    await waitFor(() => {
      expect(screen.getByText('密码至少6位')).toBeInTheDocument()
    })
  })

  it('验证通过后调用 onSubmit', async () => {
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)
    
    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: '123456' } })
    fireEvent.click(screen.getByText('登录'))
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        username: 'admin',
        password: '123456'
      })
    })
  })

  it('提交中显示加载状态', async () => {
    const onSubmit = vi.fn(() => new Promise(() => {}))
    render(<LoginForm onSubmit={onSubmit} />)
    
    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: '123456' } })
    fireEvent.click(screen.getByText('登录'))
    
    await waitFor(() => {
      expect(screen.getByText('登录中...')).toBeInTheDocument()
      expect(screen.getByText('登录中...')).toBeDisabled()
    })
  })

  it('提交失败显示错误信息', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('用户名或密码错误'))
    render(<LoginForm onSubmit={onSubmit} />)
    
    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByText('登录'))
    
    await waitFor(() => {
      expect(screen.getByText('用户名或密码错误')).toBeInTheDocument()
    })
  })
})
```

### 列表组件测试

```tsx
// UserList.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import UserList from './UserList'

const mockUsers = [
  { id: 1, name: '张三', email: 'zhangsan@example.com' },
  { id: 2, name: '李四', email: 'lisi@example.com' },
  { id: 3, name: '王五', email: 'wangwu@example.com' }
]

describe('UserList', () => {
  it('加载中显示骨架屏', () => {
    render(<UserList loading={true} users={[]} />)
    
    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
  })

  it('空列表显示空状态', () => {
    render(<UserList loading={false} users={[]} />)
    
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
  })

  it('渲染用户列表', () => {
    render(<UserList loading={false} users={mockUsers} />)
    
    expect(screen.getByText('张三')).toBeInTheDocument()
    expect(screen.getByText('李四')).toBeInTheDocument()
    expect(screen.getByText('王五')).toBeInTheDocument()
  })

  it('点击分页触发 onPageChange', () => {
    const onPageChange = vi.fn()
    render(
      <UserList 
        loading={false} 
        users={mockUsers} 
        total={100} 
        page={1} 
        onPageChange={onPageChange} 
      />
    )
    
    fireEvent.click(screen.getByText('2'))
    
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('搜索触发 onSearch', async () => {
    const onSearch = vi.fn()
    render(
      <UserList 
        loading={false} 
        users={mockUsers} 
        onSearch={onSearch} 
      />
    )
    
    fireEvent.change(screen.getByPlaceholderText('搜索用户'), { target: { value: '张' } })
    
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('张')
    }, { timeout: 500 })
  })
})
```

## 工具函数测试

```ts
// format.test.ts
import { 
  formatDate, 
  formatCurrency, 
  formatPhoneNumber,
  truncateText,
  debounce 
} from './format'

describe('formatDate', () => {
  it('格式化为 YYYY-MM-DD', () => {
    expect(formatDate(new Date('2024-01-15'))).toBe('2024-01-15')
  })

  it('格式化为 YYYY-MM-DD HH:mm:ss', () => {
    expect(formatDate(new Date('2024-01-15 10:30:00'), 'datetime')).toBe('2024-01-15 10:30:00')
  })

  it('null 返回 -', () => {
    expect(formatDate(null)).toBe('-')
  })

  it('undefined 返回 -', () => {
    expect(formatDate(undefined)).toBe('-')
  })
})

describe('formatCurrency', () => {
  it('格式化为人民币', () => {
    expect(formatCurrency(1234.5)).toBe('¥1,234.50')
  })

  it('处理 0', () => {
    expect(formatCurrency(0)).toBe('¥0.00')
  })

  it('处理负数', () => {
    expect(formatCurrency(-100)).toBe('-¥100.00')
  })
})

describe('formatPhoneNumber', () => {
  it('格式化手机号', () => {
    expect(formatPhoneNumber('13812345678')).toBe('138****5678')
  })

  it('无效手机号返回原值', () => {
    expect(formatPhoneNumber('123')).toBe('123')
  })
})

describe('truncateText', () => {
  it('超过长度截断并加省略号', () => {
    expect(truncateText('这是一段很长的文本', 5)).toBe('这是一段很...')
  })

  it('不超过长度返回原值', () => {
    expect(truncateText('短文本', 10)).toBe('短文本')
  })
})

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('延迟执行', () => {
    const fn = vi.fn()
    const debouncedFn = debounce(fn, 100)
    
    debouncedFn()
    expect(fn).not.toHaveBeenCalled()
    
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('多次调用只执行最后一次', () => {
    const fn = vi.fn()
    const debouncedFn = debounce(fn, 100)
    
    debouncedFn()
    debouncedFn()
    debouncedFn()
    
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledOnce()
  })
})
```

## API 服务测试

```ts
// userService.test.ts
import { vi } from 'vitest'
import { createUser, getUser, updateUser, deleteUser } from './userService'
import api from './api'

vi.mock('./api')

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createUser', () => {
    it('成功创建用户', async () => {
      const mockResponse = { data: { id: 1, name: 'test' } }
      api.post.mockResolvedValue(mockResponse)
      
      const result = await createUser({ name: 'test', email: 'test@example.com' })
      
      expect(api.post).toHaveBeenCalledWith('/users', { name: 'test', email: 'test@example.com' })
      expect(result).toEqual(mockResponse.data)
    })

    it('创建失败抛出错误', async () => {
      api.post.mockRejectedValue({ response: { data: { message: '邮箱已存在' } } })
      
      await expect(createUser({ name: 'test', email: 'exist@example.com' }))
        .rejects.toThrow('邮箱已存在')
    })
  })

  describe('getUser', () => {
    it('成功获取用户', async () => {
      const mockUser = { id: 1, name: 'test' }
      api.get.mockResolvedValue({ data: mockUser })
      
      const result = await getUser(1)
      
      expect(api.get).toHaveBeenCalledWith('/users/1')
      expect(result).toEqual(mockUser)
    })

    it('用户不存在返回 null', async () => {
      api.get.mockRejectedValue({ response: { status: 404 } })
      
      const result = await getUser(999)
      
      expect(result).toBeNull()
    })
  })
})
```

## Pinia Store 测试

```ts
// useUserStore.test.ts
import { setActivePinia, createPinia } from 'pinia'
import { vi } from 'vitest'
import { useUserStore } from './useUserStore'
import api from './api'

vi.mock('./api')

describe('useUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始状态', () => {
    const store = useUserStore()
    
    expect(store.users).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchUsers 成功', async () => {
    const mockUsers = [{ id: 1, name: 'test' }]
    api.get.mockResolvedValue({ data: mockUsers })
    
    const store = useUserStore()
    await store.fetchUsers()
    
    expect(store.users).toEqual(mockUsers)
    expect(store.loading).toBe(false)
  })

  it('fetchUsers 失败', async () => {
    api.get.mockRejectedValue(new Error('Network Error'))
    
    const store = useUserStore()
    await store.fetchUsers()
    
    expect(store.users).toEqual([])
    expect(store.error).toBe('Network Error')
    expect(store.loading).toBe(false)
  })

  it('addUser 添加用户', async () => {
    const newUser = { name: 'new' }
    const mockResponse = { data: { id: 2, ...newUser } }
    api.post.mockResolvedValue(mockResponse)
    
    const store = useUserStore()
    await store.addUser(newUser)
    
    expect(store.users).toContainEqual(mockResponse.data)
  })

  it('removeUser 删除用户', async () => {
    api.delete.mockResolvedValue({})
    
    const store = useUserStore()
    store.users = [{ id: 1, name: 'test' }, { id: 2, name: 'test2' }]
    
    await store.removeUser(1)
    
    expect(store.users).toHaveLength(1)
    expect(store.users[0].id).toBe(2)
  })
})
```

## 自定义 Hook 测试

```ts
// useDebounce.test.ts
import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('返回初始值', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    
    expect(result.current).toBe('initial')
  })

  it('延迟更新值', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )
    
    rerender({ value: 'updated', delay: 500 })
    
    expect(result.current).toBe('initial')
    
    act(() => {
      vi.advanceTimersByTime(500)
    })
    
    expect(result.current).toBe('updated')
  })

  it('多次更新只保留最后一次', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )
    
    rerender({ value: 'update1', delay: 500 })
    rerender({ value: 'update2', delay: 500 })
    rerender({ value: 'update3', delay: 500 })
    
    act(() => {
      vi.advanceTimersByTime(500)
    })
    
    expect(result.current).toBe('update3')
  })
})
```

```ts
// useLocalStorage.test.ts
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from './useLocalStorage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('返回初始值', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'))
    
    expect(result.current[0]).toBe('default')
  })

  it('读取已存储的值', () => {
    localStorage.setItem('key', JSON.stringify('stored'))
    
    const { result } = renderHook(() => useLocalStorage('key', 'default'))
    
    expect(result.current[0]).toBe('stored')
  })

  it('更新值并存储', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'))
    
    act(() => {
      result.current[1]('updated')
    })
    
    expect(result.current[0]).toBe('updated')
    expect(JSON.parse(localStorage.getItem('key')!)).toBe('updated')
  })
})
```

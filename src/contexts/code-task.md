# {任务ID}: {任务名称}

## 工作目录
{git 仓库根目录，如 /home/user/project、D:\project\xxx}

## 代码目录
{具体修改的代码目录，如 src/handler/、src/model/}

## 任务依赖
- {依赖任务ID}：{依赖任务名称}

## 工作内容
- 生成 {文件1}
- 实现 {函数1}

## 详细逻辑设计
1. {步骤1}
2. {步骤2}
3. {步骤3}

## 边界情况处理
| 场景 | 处理方式 |
|------|----------|
| {场景1} | {处理方式1} |
| {场景2} | {处理方式2} |

## 函数链路图
````
Controller → Service → Model → MySQL
````

## 真实单元测试代码

### 测试文件
{测试文件路径，如 src/handler/user_test.go、src/handler/user.test.ts}

### 测试代码

**Go 示例:**
```go
package handler

import (
    "testing"
)

func TestCreateUser(t *testing.T) {
    // 测试用例 1: 正常创建用户
    t.Run("正常创建用户", func(t *testing.T) {
        // 准备测试数据
        // 调用函数
        // 验证结果
    })

    // 测试用例 2: 参数校验失败
    t.Run("参数校验失败", func(t *testing.T) {
        // 准备测试数据
        // 调用函数
        // 验证结果
    })

    // 测试用例 3: 数据库错误
    t.Run("数据库错误", func(t *testing.T) {
        // 准备测试数据
        // 调用函数
        // 验证结果
    })
}
```

**前端示例:**
```typescript
import { describe, it, expect } from 'vitest'
import { createUser } from './user'

describe('createUser', () => {
  it('正常创建用户', async () => {
    // 准备测试数据
    // 调用函数
    // 验证结果
  })

  it('参数校验失败', async () => {
    // 准备测试数据
    // 调用函数
    // 验证结果
  })

  it('数据库错误', async () => {
    // 准备测试数据
    // 调用函数
    // 验证结果
  })
})
```

## 测试用例
| 场景 | 输入 | 预期输出 |
|------|------|----------|
| {场景1} | {输入1} | {输出1} |
| {场景2} | {输入2} | {输出2} |

## 风险评估
- 影响范围: {影响范围}
- 兼容性: {兼容性分析}
- 风险等级: {低/中/高}

## 审查要点
- [ ] {审查点1}
- [ ] {审查点2}

## 验收标准
- [ ] {验收点1}
- [ ] {验收点2}

## 执行要求

1. **先 cd 到工作目录执行任务**
   ````
   bash: cd {工作目录}
   ````
2. 执行编码任务，生成/修改代码
3. 调用 dct_validate 验证产物，必须传递 workDir 参数：
   ````
   dct_validate(taskId: "{任务ID}", artifact: "{产物路径}", workDir: "{工作目录}")
   ````
4. 如果验证失败，根据错误信息修改代码，重新验证，最多重试 3 次
5. 执行完成后，返回以下 JSON 格式：

```json
{
  "taskId": "{任务ID}",
  "status": "success | failed",
  "artifacts": ["{产物路径1}", "{产物路径2}"],
  "message": "任务完成",
  "errors": [],
  "retryCount": 0
}
```

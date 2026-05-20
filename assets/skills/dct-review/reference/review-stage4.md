# 阶段四：TDD 并行执行 - 审查清单

## 审查范围

产物文件：各项目代码文件（由 `{产物文件列表}` 指定）

基准文件：
- `prd/{YYYY-MM-DD-<英文简述>}/plan.md`（实现计划）
- `prd/{YYYY-MM-DD-<英文简述>}/api.json`（接口设计）
- `prd/{YYYY-MM-DD-<英文简述>}/design.md`（方案设计）

---

## 审查规则

### R1. 代码编译检查

检查代码是否能成功编译。

**Go 后端项目**：
```bash
cd {项目目录}
go build ./...
```

**前端项目**：
```bash
cd {项目目录}
npx tsc --noEmit  # TypeScript 编译检查
```

**通过条件**：
- 编译无错误
- 编译警告数量 ≤ 5

---

### R2. 单元测试检查

检查单元测试是否通过。

**Go 后端项目**：
```bash
cd {项目目录}
go test ./... -v
```

**前端项目**：
```bash
cd {项目目录}
npx jest --coverage
```

**通过条件**：
- 所有测试通过
- 分支覆盖率 ≥ 80%

---

### R3. Task 契约一致性

检查代码实现是否与 `plan.md` 中的 Task 契约一致。

**Grep 提取 plan 中的输出契约**：
```
Grep pattern="输出|文件路径|函数签名|类型定义|组件" path="{plan.md路径}"
```

**Grep 检查代码中的实现**：
```
# Go 后端
Grep pattern="func.*\\(|type.*struct|type.*interface" path="{代码目录}"

# 前端
Grep pattern="export.*function|export.*const|export.*interface|export.*type" path="{代码目录}"
```

**通过条件**：
- 每个 Task 的输出文件存在
- 函数/类型/组件签名与契约一致
- 无遗漏的 Task 输出

---

### R4. API 实现一致性

检查代码中的 API 实现是否与 `api.json` 一致。

**Grep 提取 api.json 中的端点**：
```
Grep pattern="paths|get|post|put|delete" path="{api.json路径}"
```

**Grep 检查代码中的路由注册**：
```
# Go 后端
Grep pattern="router\\.|app\\.|HandleFunc|Handle\\(" path="{代码目录}"

# 前端
Grep pattern="axios\\.|fetch\\.|api\\.|endpoint" path="{代码目录}"
```

**通过条件**：
- api.json 中的每个端点在代码中有对应实现
- HTTP 方法一致
- 路径一致

---

### R5. 测试覆盖完整性

检查测试用例是否覆盖 plan.md 中要求的场景。

**Grep 提取 plan 中的测试要求**：
```
Grep pattern="测试|场景|test|Test" path="{plan.md路径}"
```

**Grep 检查代码中的测试**：
```
Grep pattern="func Test|describe\\(|it\\(|test\\(" path="{代码目录}"
```

**通过条件**：
- plan 中要求的每个测试场景在代码中有对应测试
- 测试覆盖正向/异常/边界场景

---

### R6. 安全性检查

检查代码是否有明显安全漏洞。

**Grep 检查常见漏洞**：
```
# SQL 注入
Grep pattern="fmt\\.Sprintf.*SELECT|fmt\\.Sprintf.*INSERT|fmt\\.Sprintf.*UPDATE|fmt\\.Sprintf.*DELETE" path="{代码目录}"

# XSS
Grep pattern="innerHTML|v-html|dangerouslySetInnerHTML" path="{代码目录}"

# 硬编码凭证
Grep pattern="password\\s*[:=]\\s*['\"]|secret\\s*[:=]\\s*['\"]|token\\s*[:=]\\s*['\"]" path="{代码目录}" -i
```

**通过条件**：
- 无 SQL 注入风险（使用参数化查询）
- 无 XSS 风险（使用转义输出）
- 无硬编码凭证

---

## 审查输出格式

```markdown
## 阶段四审查结果

### R1. 代码编译检查
- [✅/❌] 编译结果
  错误：（如有）
  警告数量：X

### R2. 单元测试检查
- [✅/❌] 测试结果
  通过/失败：X/Y
  分支覆盖率：X%

### R3. Task 契约一致性
- [✅/❌] 契约检查结果
  问题：（如有）

### R4. API 实现一致性
- [✅/❌] API 一致性检查结果
  问题：（如有）

### R5. 测试覆盖完整性
- [✅/❌] 测试覆盖检查结果
  问题：（如有）

### R6. 安全性检查
- [✅/❌] 安全检查结果
  漏洞：（如有）
```

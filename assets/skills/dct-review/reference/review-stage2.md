# 阶段二：方案设计 - 审查清单

## 审查范围

产物文件：
- `prd/{YYYY-MM-DD-<英文简述>}/design.md`（方案设计文档）
- `prd/{YYYY-MM-DD-<英文简述>}/api.json`（OpenAPI 3.0 接口定义）
- `prd/{YYYY-MM-DD-<英文简述>}/test-case.md`（测试用例）

基准文件：`prd/{YYYY-MM-DD-<英文简述>}/checkpoint.md`

---

## 审查规则

### R1. design.md 结构完整性

检查 `design.md` 是否包含所有必需章节：

| 必需章节 | 检查方式 | 说明 |
|----------|----------|------|
| 一、数据库变更分析 | Grep `## 一、数据库变更分析` | 数据库设计 |
| 1.1 现有表字段变更 | Grep `### 1.1 现有表字段变更` | 表字段变更 |
| 1.2 新增表 | Grep `### 1.2 新增表` | 新表设计 |
| 1.4 数据库确认清单 | Grep `### 1.4 数据库确认清单` | 确认可勾选 |
| 二、后端代码分析 | Grep `## 二、后端代码分析` | 后端设计 |
| 2.1 可复用函数 | Grep `### 2.1 可复用函数` | 复用分析 |
| 2.2 需新增函数 | Grep `### 2.2 需新增函数` | 新增分析 |
| 2.3 API 设计 | Grep `### 2.3 API 设计` | API 设计 |
| 2.4 错误码定义 | Grep `### 2.4 错误码定义` | 错误码 |
| 2.5 后端确认清单 | Grep `### 2.5 后端确认清单` | 确认可勾选 |
| 三、前端代码分析 | Grep `## 三、前端代码分析` | 前端设计 |
| 3.1 可复用组件 | Grep `### 3.1 可复用组件` | 复用分析 |
| 3.2 需新增组件 | Grep `### 3.2 需新增组件` | 新增分析 |
| 3.3 路由设计 | Grep `### 3.3 路由设计` | 路由设计 |
| 3.4 前端确认清单 | Grep `### 3.4 前端确认清单` | 确认可勾选 |
| 四、边界条件与错误处理 | Grep `## 四、边界条件与错误处理` | 边界条件 |
| 五、契约层代码 | Grep `## 五、契约层代码` | 契约代码 |
| 5.1 Entity | Grep `### 5.1 Entity` | Entity 定义 |
| 5.2 DTO | Grep `### 5.2 DTO` | DTO 定义 |
| 5.3 TypeScript 类型 | Grep `### 5.3 TypeScript 类型` | TS 类型 |
| 5.4 SQL DDL | Grep `### 5.4 SQL DDL` | DDL 定义 |
| 六、确认结论 | Grep `## 六、确认结论` | 最终确认 |

**通过条件**：所有必需章节均存在且非空。

---

### R2. 字段完整性（design vs checkpoint）

检查 `design.md` 中声明的 Entity/DTO 字段是否与 `checkpoint.md` 一致。

**Grep 提取 checkpoint 字段**：
```
Grep pattern="字段|field|属性|column" path="{checkpoint路径}"
```

**Grep 提取 design 字段**：
```
Grep pattern="字段|field|属性|column|Entity|DTO" path="{design.md路径}"
```

**通过条件**：
- checkpoint 中定义的每个字段在 design 中有对应说明
- 无遗漏字段
- 无多余字段（checkpoint 未定义但 design 中出现的）

---

### R3. API 一致性（design/api.json vs checkpoint）

检查 `design.md` 和 `api.json` 中的 API 端点是否与 `checkpoint.md` 一致。

**Grep 提取 checkpoint API**：
```
Grep pattern="GET|POST|PUT|DELETE|PATCH|接口|API|端点|endpoint" path="{checkpoint路径}"
```

**Grep 提取 design API**：
```
Grep pattern="GET|POST|PUT|DELETE|PATCH|接口|API|端点|endpoint" path="{design.md路径}"
```

**Grep 提取 api.json 端点**：
```
Grep pattern="paths|get|post|put|delete" path="{api.json路径}"
```

**通过条件**：
- checkpoint 中要求的每个 API 在 design 和 api.json 中有对应设计
- HTTP 方法一致
- 请求/响应结构一致

---

### R4. 功能覆盖完整性

检查 `checkpoint.md` 中每个验收场景是否在 `design.md` 中有对应设计覆盖。

**Grep 提取 checkpoint 验收点**：
```
Grep pattern="验收|场景|功能|需求|CP-" path="{checkpoint路径}"
```

**Grep 提取 design 覆盖**：
```
Grep pattern="验收|场景|功能|需求|覆盖" path="{design.md路径}"
```

**通过条件**：
- 每个验收点在 design 中有明确的设计覆盖
- 无遗漏的验收场景

---

### R5. 契约层代码一致性

检查 `design.md` 中的契约层代码（Entity/DTO/TypeScript 类型）是否自洽。

**Read 验证**：读取 `## 五、契约层代码` 章节。

**通过条件**：
- Entity 字段与 DDL 字段一一对应
- DTO 字段与 Entity 字段一致
- TypeScript 类型与 DTO 字段一致
- binding tag 包含校验规则
- gorm tag 与数据库字段对应

---

### R6. 格式规范

**Glob 检查**：
- 文件路径符合 `prd/{YYYY-MM-DD-<英文简述>}/` 格式
- api.json 为有效 JSON
- 文件编码为 UTF-8

**Read 抽查**：
- 标题层级正确（# → ## → ###）
- 表格格式规范
- 确认清单可勾选（`- [ ]` 格式）

---

## 审查输出格式

```markdown
## 阶段二审查结果

### R1. design.md 结构完整性
- [✅/❌] 必需章节检查结果
  缺失章节：（如有）

### R2. 字段完整性
- [✅/❌] 字段对比结果
  遗漏字段：（如有）
  多余字段：（如有）

### R3. API 一致性
- [✅/❌] API 对比结果
  遗漏 API：（如有）

### R4. 功能覆盖完整性
- [✅/❌] 验收点覆盖结果
  未覆盖验收点：（如有）

### R5. 契约层代码一致性
- [✅/❌] 契约代码检查结果
  问题：（如有）

### R6. 格式规范
- [✅/❌] 格式检查结果
  问题：（如有）
```

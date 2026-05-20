# 阶段三：原子拆分 - 审查清单

## 审查范围

产物文件：`prd/{YYYY-MM-DD-<英文简述>}/plan.md`（三层 Task DAG + 每个 Task 的输入输出契约）

基准文件：
- `prd/{YYYY-MM-DD-<英文简述>}/checkpoint.md`（验收标准）
- `prd/{YYYY-MM-DD-<英文简述>}/design.md`（方案设计）
- `prd/{YYYY-MM-DD-<英文简述>}/api.json`（接口定义）

---

## 审查规则

### R1. plan.md 结构完整性

检查 `plan.md` 是否包含所有必需章节：

| 必需章节 | 检查方式 | 说明 |
|----------|----------|------|
| 一、Task DAG 依赖图 | Grep `## 一、Task DAG 依赖图` | 依赖图 |
| 二、Task 契约 | Grep `## 二、Task 契约` | Task 详情 |
| 三、需求覆盖矩阵 | Grep `## 三、需求覆盖矩阵` | 覆盖矩阵 |
| 四、执行单元 | Grep `## 四、执行单元` | 执行单元表 |
| 五、里程碑 | Grep `## 五、里程碑` | 里程碑列表 |

**通过条件**：所有必需章节均存在且非空。

---

### R2. Task 契约完整性

检查每个 Task 契约是否包含完整的输入/输出定义。

**Grep 提取 Task 结构**：
```
Grep pattern="### T\\d+|层级|项目|依赖|上下文估算|输入|输出|测试" path="{plan.md路径}"
```

**通过条件**：
- 每个 Task 包含：层级、项目、依赖、上下文估算、输入、输出、测试
- 输出包含精确的文件路径
- 输出包含函数/类型/组件签名

---

### R3. 三层拆分正确性

检查 Task 是否按三层模型正确拆分。

**Grep 提取层级**：
```
Grep pattern="前置契约|业务接口|前端 UI" path="{plan.md路径}"
```

**通过条件**：
- 前置契约层：Entity/DDL/DTO/TS类型/API签名
- 业务接口层：handler+service+route+测试（一个接口一个 Task）
- 前端 UI 层：组件/页面/hook+测试
- 业务接口层 Task 之间无实现级依赖

---

### R4. 依赖关系无循环

检查 Task 依赖图是否有循环。

**Grep 提取依赖**：
```
Grep pattern="依赖|→|──▶" path="{plan.md路径}"
```

**通过条件**：
- 依赖图无循环
- 依赖的任务 ID 存在
- 前置契约层无依赖（或仅依赖其他前置契约）

---

### R5. 需求覆盖完整性

检查 `plan.md` 中的覆盖矩阵是否覆盖所有 checkpoint 验收点和 api.json 端点。

**Grep 提取 checkpoint 验收点**：
```
Grep pattern="CP-\\d+|验收" path="{checkpoint路径}"
```

**Grep 提取覆盖矩阵**：
```
Grep pattern="CP-\\d+|验收|覆盖矩阵" path="{plan.md路径}"
```

**Grep 提取 api.json 端点**：
```
Grep pattern="paths|get|post|put|delete" path="{api.json路径}"
```

**通过条件**：
- 每个 checkpoint ID 在覆盖矩阵中有对应 Task
- 每个 api.json 端点在覆盖矩阵中有对应 Task
- 无遗漏的验收点

---

### R6. 格式规范

**Glob 检查**：
- 文件路径符合 `prd/{YYYY-MM-DD-<英文简述>}/plan.md` 格式
- 文件编码为 UTF-8

**Read 抽查**：
- Task ID 唯一（T1, T2, T3...）
- 执行单元 ID 唯一（U-001, U-002...）
- 依赖图格式正确

---

## 审查输出格式

```markdown
## 阶段三审查结果

### R1. plan.md 结构完整性
- [✅/❌] 必需章节检查结果
  缺失章节：（如有）

### R2. Task 契约完整性
- [✅/❌] Task 契约检查结果
  问题：（如有）

### R3. 三层拆分正确性
- [✅/❌] 三层拆分检查结果
  问题：（如有）

### R4. 依赖关系无循环
- [✅/❌] 依赖关系检查结果
  问题：（如有）

### R5. 需求覆盖完整性
- [✅/❌] 覆盖矩阵检查结果
  未覆盖验收点：（如有）
  未覆盖 API：（如有）

### R6. 格式规范
- [✅/❌] 格式检查结果
  问题：（如有）
```

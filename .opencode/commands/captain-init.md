---
description: 初始化 dream-come-true 插件的测试认证环境
agent: captain
---

# captain_init：初始化插件环境

执行以下流程初始化测试认证环境。

## 流程

### 步骤 1：收集基本信息
使用 question 工具询问：
- Q1: "请提供项目的登录接口路径（如 /api/login）"
- Q2: "请提供项目的注册接口路径（如 /api/register）"
- Q3: "请提供项目代码路径（用于读取认证中间件）"

### 步骤 2：分析认证代码
- 读取项目中的认证中间件代码
- 分析 auth 方式（JWT/Session/OAuth）
- 提取 JWT 密钥或签名私钥

### 步骤 3：查询用户角色
使用 MCP MySQL 查询：
- 用户表结构
- 现有用户和角色分布

### 步骤 4：询问测试账号
使用 question 工具询问：
- Q1: "是否已有测试账号？" → [是, 否]
- 如果是：询问每个角色对应的测试账号邮箱
- 使用 MCP MySQL 验证账号是否存在
- 如果否：根据注册接口创建测试账号

### 步骤 5：生成 skill
生成 `.opencode/skills/test-auth/SKILL.md`，包含：
- 认证方式和配置（JWT 密钥）
- 角色列表和对应用户
- Token 生成逻辑

### 步骤 6：生成 token JSON
生成 `tests/fixtures/test-users.json`，包含：
- 每个角色的真实用户信息
- 根据 JWT 密钥生成的 token

## 完成
初始化完成后，提示用户可以调用 /captain_run 启动流水线。

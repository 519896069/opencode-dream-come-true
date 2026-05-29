---
name: standards-business-analysis
description: Use when user wants to analyze existing business processes from console menu, frontend code and backend code to generate business function points, data flow diagrams, MySQL ER diagrams and API documentation PRD.
---

# Business Analysis Skill

## Overview

通过输入控制台菜单，读取前端代码 + 后端代码，使用第一性原理分析业务，输出完整的业务功能点、数据流线稿、MySQL 数据库关系图、API 文档 PRD。

## When to Use

- 用户想梳理现有系统的业务流程
- 需要理解控制台菜单对应的前后端实现
- 需要生成数据库ER图和API文档
- 需要输出PRD格式的业务文档

**开始这个SKILL时**
需要检查 standards skill 是否存在，如果不存在那么提示 "需要添加 standards skill 后再调用此 skill" 然后结束流程

## Input

用户提供的控制台菜单列表

## Process

### Phase 1: 业务功能点梳理

对每个菜单项：
1. 找到对应的前端页面文件
2. 找到对应的 API 调用
3. 找到对应的后端接口
4. 梳理数据表和字段
5. 用第一性原理追问：这是什么问题？谁在用？解决什么？

### Phase 2: 数据流线稿

```
用户操作 → 前端页面 → API调用 → 后端路由 → Controller → Model → MySQL
```

### Phase 3: MySQL ER 图

使用文本方式绘制 ER 图：
```
┌─────────────┐       ┌─────────────┐
│   table_a   │──1:N──│   table_b   │
└─────────────┘       └─────────────┘
```

### Phase 4: API 文档 PRD

每个 API 输出：
- URL & Method
- Request Parameters
- Response Structure
- Business Logic Description

## Output Format

```markdown
# [业务模块名称] PRD

## 一、业务功能点

| 功能编号 | 功能名称 | 说明 |
|---------|---------|------|
| F001 | 菜单项1 | 描述 |

## 二、数据流线稿

[ASCII 数据流图]

## 三、数据库设计

### 3.1 ER 图
[ER 图]

### 3.2 表结构
[表结构详情]

## 四、API 文档

### 4.1 [接口名称]
- URL:
- Method:
- Request:
- Response:
```

## RULES 文件管理规范

### 目录结构

```
standards/reference/business/
└── {需求名称}_rules.md
```

### 命名规范

- **目录名**：需求名称（英文下划线），如 `user_login`
- **文件名**：`{需求名称}_rules.md`，如 `user_login_rules.md`

### 示例

```
standards/reference/business/
├── user_login_rules.md
├── ...
└── xxx_rules.md
```

### 保存操作

每次完成业务分析后
1、必须将 RULES 文档保存到 `onion-skill/standards/reference/business/{需求名称}_rules.md`
2、修改 standards skill 的"业务规则自动识别"、"自动识别示例"、"规范索引" 三个模块

## Key Principles

1. **第一性原理**：从用户需求出发，不预设功能
2. **端到端**：从菜单 → 前端 → API → 后端 → 数据库 全链路打通
3. **不确定就问**：遇到模糊之处必须向用户确认
4. **结构化输出**：统一使用 "Output Format" 格式

## Common Mistakes

- 只看前端不看后端 → 数据流不完整
- 只看后端不看前端 → 用户操作路径缺失
- 不询问用户 → 业务背景理解错误
- 缺少 ER 图 → 数据库关系不清晰

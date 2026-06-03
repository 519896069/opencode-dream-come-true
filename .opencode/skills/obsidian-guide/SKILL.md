---
name: obsidian-guide
description: 使用 obsidian 工具前一定要读取这个skill ,在 Obsidian 中打开笔记、新建笔记、预览产物或搜索的指南
---

# obsidian-guide

obsidian 工具用于在 Obsidian 桌面应用中执行常用操作：打开笔记预览、新建笔记、打开日记、搜索笔记、打开关系图谱、执行高级命令。

工具返回 JSON 包含 uri（obsidian:// 协议链接）和 command（PowerShell 执行命令），通过 bash 执行即可唤起 Obsidian。

## 使用方式

触发词：obsidian怎么用 / 打开obsidian / preview in obsidian / 在obsidian中打开

## 工具参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| action | enum | 是 | open / new / daily / search / graph / settings / advanced |
| vault | string | 除 settings 外必填 | Obsidian 库名 |
| file | string | open/new 时 | 文件路径（相对于库根目录） |
| name | string | new 时 | 新建笔记标题 |
| folder | string | new 时 | 目标文件夹路径 |
| content | string | new 时 | 笔记初始内容 |
| query | string | search 时 | 搜索关键词 |
| commandid | string | advanced 时 | 命令 ID |
| heading | string | open 时 | 跳转到指定标题 |
| blockId | string | open 时 | 跳转到块引用 |

## 常用场景

### 打开笔记预览

调用 obsidian(action="open", vault="库名", file="prd/xxx/design.md")

### 打开日记

调用 obsidian(action="daily", vault="库名")

### 搜索笔记

调用 obsidian(action="search", vault="库名", query="关键词")

### 新建笔记

调用 obsidian(action="new", vault="库名", name="笔记标题", folder="文件夹")

### 高级命令

调用 obsidian(action="advanced", vault="库名", commandid="daily-notes")

## 与 Planner 流水线集成

Planner 在以下环节自动调用 obsidian 工具：

| 时机 | 操作 |
|------|------|
| dct_run 之后 | 打开 kanban.md 看板 |
| 阶段产物生成后 | 打开每个生成的产物文件（design.md 等） |
| kanban 更新后 | 打开 kanban.md 查看最新状态 |
| inspector 完成 | 打开审查日志 |

## 注意事项

- vault 参数必须与 Obsidian 中显示的库名一致
- 中文文件名需要 URL 编码（工具自动处理）
- 如果 Obsidian 已打开该笔记，会在当前窗口直接激活

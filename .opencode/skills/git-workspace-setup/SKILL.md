---
name: git-workspace-setup
description: 从 design.md 读取涉及项目，创建 git worktree 工作区，生成 .code-workspace 并用 VS Code 打开
---

# Git Workspace Setup

在 m2 阶段用户确认设计后，根据 design.md 中的"涉及项目"，为每个项目创建 git worktree 工作区，复制环境配置文件，并生成 .code-workspace 文件用 VS Code 打开。

## 触发时机

- m2 阶段用户确认设计后，在 m2 上下文中调用
- 用户说"创建工作区"、"git worktree"、"打开工作区"时触发

## 输入参数（占位符）

| 占位符 | 说明 | 来源 | 必填 |
|--------|------|------|:----:|
| `<design_path>` | design.md 文件路径 | 上下文/询问 | ✓ |
| `<base_branch>` | 基分支名称 | 上下文/询问 | ✓ |
| `<iteration>` | 迭代名称 | 询问 | ✓ |
| `<feature>` | 需求名称（英文） | 询问 | ✓ |
| `<developer>` | 开发者姓名缩写（默认 `fzp`） | 询问 | ✓ |
| `<branch_name>` | dev_<iteration>/feature_<feature>_<developer> | 自动生成 | - |
| `<workspace_root>` | 当前工作目录 | 上下文 | - |
| `<project_paths>` | 从 design.md 解析的项目路径列表 | 解析 | - |

## 执行步骤

### Phase 1: 解析 design.md

1. 读取 `<design_path>`
2. 查找"六、涉及项目"部分
3. 提取所有项目路径（完整路径，每行一个 `- ` 开头）
4. 如果缺失则报错终止：`"design.md 必须包含'涉及项目'部分"`

### Phase 2: 确认参数

如果上下文中没有以下参数，向用户询问：

- 基分支 `<base_branch>`
- 迭代名称 `<iteration>`
- 需求名称 `<feature>`（英文，如 `user_login`）
- 开发者姓名缩写 `<developer>`（默认 `fzp`，如需修改请询问用户）

### Phase 3: 创建 worktree

分支名格式：`dev_<iteration>/feature_<feature>_<developer>`

对每个 `<project_path>` 执行：

```bash
cd <project_path>
git worktree add <workspace_root>/worktree/<branch_name>/<project_name> -b <branch_name> <base_branch>
```

### Phase 4: 复制环境文件

从每个 `<project_path>/` 复制到 `<workspace_root>/worktree/<branch_name>/<project_name>/`：

| 文件/目录 | 说明 |
|-----------|------|
| `.env` | 环境变量 |
| `.env.*` | 环境变量变体（如 `.env.local`, `.env.development`） |
| `*.config` | 配置文件（如 `tailwind.config.js`） |
| `.config.*` | 配置文件变体 |
| `.vscode/` | VS Code 配置文件夹（整个目录） |

复制命令示例（PowerShell）：

```powershell
# 复制环境文件
Copy-Item -Path "<project_path>\.env*" -Destination "<worktree_project_path>\" -Force -ErrorAction SilentlyContinue
Copy-Item -Path "<project_path>\*.config*" -Destination "<worktree_project_path>\" -Force -ErrorAction SilentlyContinue

# 复制 .vscode 文件夹
Copy-Item -Path "<project_path>\.vscode" -Destination "<worktree_project_path>\" -Recurse -Force -ErrorAction SilentlyContinue
```

### Phase 5: 生成 .code-workspace

文件路径：`<workspace_root>/worktree/<branch_name>/<iteration>_<feature>_<developer>.code-workspace`

```json
{
  "folders": [
    { "name": "<project_name>", "path": "./<project_name>" }
  ],
  "settings": {}
}
```

### Phase 6: 打开工作区

```bash
code-insider <workspace_file_path>
```

## 目录结构示例

```
<workspace_root>/
├── prd/
│   └── <需求名>/
│       └── design.md
└── worktree/
    └── <branch_name>/
        ├── <project1>/
        │   ├── .env
        │   ├── .env.local
        │   └── .vscode/
        ├── <project2>/
        │   ├── .env
        │   └── .vscode/
        └── <iteration>_<feature>_<developer>.code-workspace
```

## design.md 解析格式

```markdown
## 六、涉及项目
- D:\project\backend
- D:\project\frontend
```

## 注意事项

- 涉及项目路径必须是完整路径（如 `D:\project\backend`）
- 分支名中禁止中文
- 如果 worktree 目录已存在，先删除再重建
- 复制文件时使用 `-Force` 参数覆盖已有文件
- `.vscode/` 文件夹需要使用 `-Recurse` 参数递归复制

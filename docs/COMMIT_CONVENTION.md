# Git 提交规范

本项目的提交信息遵循 [Angular Commit Message Guidelines](https://github.com/angular/angular/blob/main/contributing-docs/commit-message-guidelines.md) 的约定。

## 格式

每条提交信息由 **header**、**body** 和 **footer** 组成。

```
<header>
<空行>
<body>
<空行>
<footer>
```

**header** 是必需的。**body** 对大部分提交是可选的。**footer** 是可选的。

## Header

```
<type>(<scope>): <subject>
│       │             │
│       │             └─⫸ 祈使句现在时，首字母不小写，末尾无句号
│       │
│       └─⫸ Scope（可选）：受影响的功能区域
│
└─⫸ Type：必选，见下方列表
```

header 不得超过 **72 个字符**。

### Type（必需）

| Type | 说明 |
|---|---|
| **feat** | 新功能 |
| **fix** | Bug 修复 |
| **refactor** | 既不修复 Bug 也不增加功能的代码改动 |
| **perf** | 提升性能的变动 |
| **docs** | 仅文档变更 |
| **style** | 不影响代码含义的改动（空白、格式化等） |
| **test** | 添加或修正测试 |
| **build** | 影响构建系统或外部依赖的更改 |
| **ci** | CI 配置文件或脚本的变更 |
| **chore** | 杂项（维护性任务等） |

### Scope（可选）

Scope 标明了提交涉及的功能区域：

- `sidepanel` — 侧边栏
- `standalone` — 网格视图
- `options` — 选项页
- `background` — 后台 Service Worker
- `icon` — 图标相关
- `theme` — 主题系统
- `templates` — 模板预设
- `config` — 配置文件（manifest、rules.json 等）
- `deps` — 依赖项
- infra — 基础设施/工具链

如改动影响多个区域，或用 `ci`、`chore` 等不限定特定区域的 type，可省略 scope。

### Subject

- 使用祈使句、现在时："add" 而非 "added" 或 "adds"
- 首字母不要大写
- 末尾没有句号

## Body

同 subject 一样使用祈使句、现在时。Body 应解释**为什么**做这个改动、与之前行为有何不同。

推荐 body 控制在 72 个字符以内换行。

## Footer

Footer 用于记录 Breaking Changes、Deprecations 以及关联的 Issue。

### Breaking Changes

```
BREAKING CHANGE: <简要摘要>
<空行>
<详细说明 + 迁移指南>
```

### Deprecations

```
DEPRECATED: <被废弃的内容>
<空行>
<废弃说明 + 推荐的替代方案>
```

### Issue 引用

```
Closes #<issue 号>
Fixes #<issue 号>
```

## Revert

如果要撤销之前的某个提交：

```
revert: <被撤销提交的 header>

This reverts commit <SHA>.
<空行>
<撤销原因说明>
```

## 示例

```
feat(sidepanel): auto-close on non-chat tabs

Add tab change listener that closes the side panel when user switches
to a tab that is not a configured AI chat site.

Closes #23
```

```
fix(icon): fall back to Google favicon when CORP blocks cross-origin load

Claude.ai and other sites set Cross-Origin-Resource-Policy: same-origin
on their favicon, preventing <img> from loading it directly. Detect
the failure and fall back to Google S2 favicon service.

Fixes #45
```

```
refactor(standalone): extract cell cache into dedicated object

Inline Map operations scattered across 3 functions. Consolidate into
a CellCache class for better testability.
```

```
docs: add commit convention guide
```

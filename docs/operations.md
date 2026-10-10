# Operations Log

## 2025-08-17 — 构建商店发布包

- **操作类型**: 构建/打包
- **脚本路径**: `scripts/build-zip.sh`
- **用途**: 构建 Chrome Web Store 上传包 `aichats-store-v1.0.5.zip`
- **运行方式**: `bash scripts/build-zip.sh`
- **产出物与约定**: 输出 `aichats-store-v<version>.zip`，包含扩展源码 + 商店文档 + 资源文件，排除 `.DS_Store`、`_metadata`、`.git`、`docs`、`.opencode` 和历史 zip 文件
- **验证方式**: 确认 zip 文件存在且版本号与 `manifest.json` 一致

## 2026-10-01 — 构建商店发布包 v1.0.6

- **操作类型**: 构建/打包
- **脚本路径**: `scripts/build-zip.sh`
- **用途**: 构建 Chrome Web Store 上传包 `aichats-store-v1.0.6.zip`
- **运行方式**: `bash scripts/build-zip.sh`
- **产出物与约定**: 输出 `aichats-store-v<version>.zip`（55 个文件，约 811 KB），包含扩展源码 + 商店文档 + 资源文件，排除 `.DS_Store`、`_metadata`、`.git`、`docs`、`.opencode` 和历史 zip 文件
- **验证方式**: `unzip -p aichats-store-v1.0.6.zip manifest.json | grep '"version"'` 返回 `"version": "1.0.6"`

## 2026-10-09 — 调整 sync-prompts.js 生成缩进（配合 background.js 默认提示词去重）

- **操作类型**: 修改可复用脚本
- **脚本路径**: `scripts/sync-prompts.js`
- **用途**: `background.js` 中两段重复的 `SYNCED_PROMPTS` 种子数组已合并为顶层常量 `DEFAULT_PROMPTS`（`];` 顶格，条目 2 空格缩进）；同步脚本原先按 6 空格缩进写入 marker 块，会导致下次同步把缩进写回旧格式。本次将 `updateBackgroundJs()` 生成的条目与结束 marker、以及 `initMarkers()` 的兜底写入统一改为 2 空格缩进。
- **运行方式**: `node scripts/sync-prompts.js`
- **产出物与约定**: 重写 `background.js` 的 `SYNCED_PROMPTS` marker 块（现仅 1 处）、`i18n.js` 的 `SYNCED_PROMPT_IDS` 块、`_locales/<lang>/messages.json` 中的 `prompts_<id>_*` 词条
- **验证方式**: 连续两次运行 `node scripts/sync-prompts.js`，`git diff` 第二次与第一次完全一致（幂等）；`node --check background.js` 通过

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

## 2026-10-10 — 统一商店截图尺寸为 1280x800

- **操作类型**: 新增可复用脚本（结果输出到脚本同级目录，不改动源文件）
- **脚本路径**: `scripts/images/resize_sidebar_screenshots.sh`
- **用途**: 将 `assets/en/sidebar.png` 与 `assets/zh/sidebar.png` 使用 Lanczos 重采样滤镜等比缩放到不超过 1280x800，再用透明背景居中补齐留白（`-filter Lanczos -resize 1280x800 -background none -gravity center -extent 1280x800`）；结果写入脚本同级的 `output/<lang>/` 子目录，不再覆盖源文件
- **运行方式**: `bash scripts/images/resize_sidebar_screenshots.sh`
- **产出物与约定**: 生成 `scripts/images/output/en/sidebar.png`、`scripts/images/output/zh/sidebar.png`（1280x800，透明留白）；输出目录按需创建；源文件 `assets/{en,zh}/sidebar.png` 保持不变
- **验证方式**: `magick identify scripts/images/output/en/sidebar.png scripts/images/output/zh/sidebar.png` 两张均输出 `1280x800`


## 2026-10-10 — 构建商店发布包 v1.0.7

- **操作类型**: 构建/打包 + 修改可复用脚本
- **脚本路径**: `scripts/build-zip.sh`
- **用途**: 将 `manifest.json` 版本升至 1.0.7、在 `CHANGELOG.md` 写入 1.0.7 条目后，构建 Chrome Web Store 上传包 `aichats-store-v1.0.7.zip`；同时给 `build-zip.sh` 的 zip 排除列表新增 `scripts/images/output*`（避免本地截图中间产物混入）和 `assets/*/sidebar.png`（商店列表截图走商店后台单独上传，不进扩展包）
- **运行方式**: `bash scripts/build-zip.sh`
- **产出物与约定**: 输出 `aichats-store-v1.0.7.zip`（55 个文件，约 154 KB），排除 `.DS_Store`、`_metadata`、`.git`、`docs`、`.opencode`、历史 zip、`scripts/images/output*` 及 `assets/*/sidebar.png`；包内保留 `scripts/images/resize_sidebar_screenshots.sh`
- **验证方式**: `unzip -p aichats-store-v1.0.7.zip manifest.json | grep '"version"'` 返回 `"version": "1.0.7"`；`unzip -l aichats-store-v1.0.7.zip | grep -c 'sidebar.png'` 返回 0

## 2026-10-11 — 修复商店违规（关键字过多）并重新打包 v1.0.7

- **操作类型**: 构建/打包 + 文档修改
- **脚本路径**: `scripts/build-zip.sh`（未改动，复用）
- **用途**: 商店以 "Yellow Argon / 产品说明中有过多关键字" 驳回，引用文案为 README 首段列举的 `ChatGPT, DeepSeek, Claude, Kimi, Doubao and more`。据此重写 `README.md` 首段与 Features 中的预配置模板条目、同步 `docs/readme/README.zh_CN.md`，并在 `CHANGELOG.md` 增补 Docs and metadata 说明；重新构建 `aichats-store-v1.0.7.zip`
- **运行方式**: `bash scripts/build-zip.sh`
- **产出物与约定**: `aichats-store-v1.0.7.zip`（55 个文件，约 154 KB）；包内 `README.md` 不再出现站点品牌枚举，仅保留“10 pre-configured templates”的功能性描述（模板名仍可在扩展内看到）
- **验证方式**: `unzip -p aichats-store-v1.0.7.zip README.md | sed -n '3p;32p'` 两行均无品牌枚举；`unzip -p aichats-store-v1.0.7.zip README.md | grep -cE 'DeepSeek|Doubao|Kimi'` 返回 0；`unzip -p aichats-store-v1.0.7.zip manifest.json | grep version` 返回 `"1.0.7"`

## 2026-10-21 — 新增帧存活探针（probe.js）并修复打包白名单

- **操作类型**: 新增扩展源码文件 + 修改可复用脚本
- **脚本路径**: `scripts/build-zip.sh`（在 `FILES` 白名单中新增 `probe.js`，位于 `options.js` 与 `sidepanel.js` 之间）
- **用途**: 侧栏加载的第三方聊天站被 `X-Frame-Options` / CSP `frame-ancestors` 拒绝时，Chrome 用错误页替换该帧，页面内脚本不执行，扩展此前无任何检测手段。新增 `probe.js` 作为独立内容脚本（`document_start`、`allFrames`），自报 `probe-ready` 并应答面板的 `probe-ping` 心跳；面板据此判定“帧内不是我们的聊天站”并显示提示条。`build-zip.sh` 的 `FILES` 是显式白名单，漏加会导致商店包静默缺少 `probe.js`（开发态正常、发行包失效）
- **运行方式**: `bash scripts/build-zip.sh`
- **产出物与约定**: 输出 `aichats-store-v<version>.zip`，包内必须包含 `probe.js`；`background.js` 的 `updateChatScripts()` 注册两个脚本 —— `aichats-probe`（所有 `enabled` 站点，不受 `inject` 开关影响）与 `aichats-content`（`enabled && inject`）
- **验证方式**: `unzip -l aichats-store-v1.0.7.zip | grep probe.js` 命中；`node --check probe.js sidepanel.js background.js` 全部通过；本地 `X-Frame-Options: DENY` 测试页 + 正常页 + “先 ready 再跳转被拒页”三种场景下，提示条分别在约 4s、不出现、约 4s 出现，且正常帧心跳每 2s 续期、错误帧恢复后提示条自动消失

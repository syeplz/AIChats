# Operations Log

## 2025-08-17 — 构建商店发布包

- **操作类型**: 构建/打包
- **脚本路径**: `scripts/build-zip.sh`
- **用途**: 构建 Chrome Web Store 上传包 `aichats-store-v1.0.5.zip`
- **运行方式**: `bash scripts/build-zip.sh`
- **产出物与约定**: 输出 `aichats-store-v<version>.zip`，包含扩展源码 + 商店文档 + 资源文件，排除 `.DS_Store`、`_metadata`、`.git`、`docs`、`.opencode` 和历史 zip 文件
- **验证方式**: 确认 zip 文件存在且版本号与 `manifest.json` 一致

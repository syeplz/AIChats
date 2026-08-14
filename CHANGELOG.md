# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2026-08-14

### Added
- Quick prompts now restore your original clipboard content after the prompt is
  filled into the chat input, so a `{clipboard}` prompt always reads your own
  copied text — never a previously generated prompt. A clipboard snapshot is
  kept in session memory only and cleared when the browser restarts.
- `scripts/build-zip.sh` for reproducible store package builds.

### Changed
- Non-text clipboard content (e.g. an image) is never overwritten by a prompt
  chip; the chip skips the write and shows a notice instead.

## [1.0.3] - 2026-07-23

### Added
- Prompt source management system with i18n sync.
- `{html}` chip variable with page-content permission handling.
- Chip auto-fill and auto-submit for chat sites.
- Loading overlay with logo and gradient animation when switching chats.
- Custom chat dropdown with site logos.
- GitHub button in the side panel.
- Clickable status labels in options (replacing toggle sliders).
- Per-site Enter-to-submit toggle.

### Changed
- Migrated storage from `chrome.storage.sync` to `chrome.storage.local`.
- Cursor placed at end after filling the chat input.
- Improved favicon detection with async cache and AI badge fallback.
- Lazy chip variable fetching only when used in a template.
- Resized store screenshots to 1280x800.

### Fixed
- `autoSubmit` and `fillInput` included in synced prompt objects.
- Enter used as primary submit fallback (removed last-button fallback).

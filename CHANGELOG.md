# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.5] - 2026-08-14

### Added
- Keep-alive sessions: switching chats no longer reloads the page — each visited
  site stays alive in the background, preserving drafts and conversations.
- New chat button in the side panel: starts a fresh conversation on the current
  site by dropping the saved snapshot and navigating to the site's new-chat page.
- Right-click context menu: select text on any page and ask a chosen AI chat
  (one item per enabled site), or translate the selection. The panel opens on
  that chat and fills the text in automatically.
- Context-menu messages reuse the retrying fill pipeline, so they arrive
  reliably even on slow chat sites.

### Changed
- Removed the standalone grid view (standalone page, expand button, columns
  setting, openStandalone message, related i18n strings) to keep the extension
  focused on the side panel.

### Fixed
- fill-input race: the panel re-sends a prompt until the chat page acks (up to
  5s), and the content script retries finding the input box, dedupes by message
  gen, and waits longer before submitting. Prompts no longer silently vanish on
  slow or first-load sites.
- Favicon prefetch no longer runs a full site crawl on every browser start; it
  now skips sites whose icon was fetched within the last 7 days.

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

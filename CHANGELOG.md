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
- Right-click context menu: select text on any page and ask AI via a quick
  prompt, send the raw selection, or translate it. The panel opens on the
  current chat and fills the text in automatically.
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

## [1.0.2] - 2026-06-24

### Fixed
- Side panel content is no longer clipped at the bottom: `panel-body` is now a
  flex container.

## [1.0.1] - 2026-06-23

Initial release to the Chrome Web Store.

### Added
- MV3 extension: use multiple AI chat websites in the Chrome side panel.
- Dark/light theme system with CSS variables and follow-system preference.
- Side panel: keep-alive iframe caching, refresh button, and no auto-close when
  switching tabs.
- Standalone grid view with scroll-snap pagination dots and per-cell refresh
  button.
- Options page: edit modal, reorder buttons, save hints, and prompt enable
  toggle.
- Quick prompts: chip bar with clipboard copy, `{clipboard}` variable, and a
  translate-clipboard default prompt.
- i18n: self-fetching locale files with runtime language switcher and localized
  default prompts.
- Favicon auto-detection for default chats and newly added templates.
- Dynamic host permission request when adding custom chat sites.
- English and Chinese READMEs.

### Changed
- Redesigned extension icon.
- Replaced `<all_urls>` host permission with specific AI chat domains to reduce
  the permissions warning.

### Fixed
- Side panel blank page on chat switch caused by a redundant `currentChatId`
  assignment.
- Favicon detection returning HTML responses or failing on Cloudflare-protected
  sites like Grok.
- Auto-scroll to bottom on tab switch in the grid view.
- Grid view tab lookup and cell relayout on resize.
- Tongyi Qianwen preset link (`tongyi.aliyun.com` → `www.qianwen.com`).
- Sidebar closing when clicking the expand button; iframe sandbox to prevent
  frame-busting escapes.

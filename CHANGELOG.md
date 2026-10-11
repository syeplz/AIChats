# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.7] - 2026-10-10

### Added
- Manual prompt compose modal: a draggable FAB opens a chat-style composer
  with an auto-growing textarea, variable pills, a round send button, and
  Ctrl/Cmd+Enter to submit (plain Enter inserts a newline). The prompt
  history lives inside the modal with live search, relative timestamps,
  keyboard navigation, hover delete, and a clear-all action.
- The composer empties after a successful submit; closing the modal without
  submitting keeps the draft, and aborted submits (e.g. `{html}` permission
  denied) keep the text untouched.

### Changed
- Store screenshots for both locales were re-exported and a reusable
  resize script (`scripts/images/resize_sidebar_screenshots.sh`) was added
  to normalize them to 1280x800.
- READMEs (EN/zh_CN): new Manual Prompts feature section and usage step.
- `background.js` dedupes the two default-prompt seed arrays into one
  `DEFAULT_PROMPTS` constant and drops the 1.0.3 sync→local migration
  (973 → 613 lines).

### Fixed
- Inserting a variable pill into an empty composer now refreshes the send
  button state and auto-grow height (`setRangeText()` fires no input event).

### Removed
- Unused helpers, styles, debug logs, and locale keys across favicon,
  content, sidepanel, options, theme, and both locale files.

### Docs and metadata
- Rewrote the store-listing description to drop the enumeration of AI chat
  site names (ChatGPT, DeepSeek, Claude, ...) to comply with the Chrome Web
  Store keyword-metadata policy; the pre-configured template names remain
  visible inside the extension.

## [1.0.6] - 2026-10-01

### Added
- Open in new tab: a header button in the side panel opens the current chat
  site in a browser tab, right next to your current one, for tasks that need
  a full-width window.
- Chip click feedback: clicking a quick prompt now plays an animated checkmark
  with a glow ring, and clipboard problems are reported in a floating bubble
  ("Clipboard empty" / "Non-text skipped") instead of overwriting the chip
  label.

### Changed
- Icon buttons in the side panel header use inline SVG icons (the settings gear
  is now a sliders glyph) and expose `aria-label` alongside `title`; the
  duplicated icon-button SVG rules were consolidated into one CSS block.

### Fixed
- Polish & Translate template: replaced a stray straight quote in the Chinese
  prompt with the proper “中文润色版” quotation marks (both the locale file
  and the bundled default in `background.js`).

### Docs and metadata
- Store users/version badges, GitHub last-commit badge, and a changelog link in
  the English and Chinese READMEs.
- Added a justification for the `contextMenus` permission and corrected the
  right-click menu description (items act on the current chat, not one item per
  site).

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

# Privacy Policy for AIChats

**Last updated:** 2026-06-20

AIChats does **not** collect, store, or transmit any personal data to any server.

## Data Stored Locally

AIChats uses `chrome.storage.local` to store the following data **only on your local device**:

- Your list of enabled/disabled AI chat sites (URLs, labels, icons)
- Your theme preference (dark/light/system)
- Your custom quick prompts (labels and content)

## Data Accessed

### Permissions Explanation

**`clipboardRead`** — Used **solely** to paste text from your clipboard into a chat input field when you click the paste button within the extension, and to snapshot your clipboard text when you click a quick prompt so the prompt can be copied without permanently overwriting your original clipboard content. This permission is activated only on that specific user action. No clipboard data is ever read automatically, stored, or transmitted outside the extension.

**`storage`** — Used to persist your preferences (chat site list, theme, layout, quick prompts) locally via `chrome.storage.local`. Data is never sent to any AIChats server. When you click a quick prompt, a snapshot of your clipboard text and the last prompt written by the extension is kept **only in memory** via `chrome.storage.session`; it is automatically cleared when the browser restarts.

**`sidePanel`** — Used to open the extension in Chrome's side panel. No data is collected.

**`declarativeNetRequest`** — Used to remove `X-Frame-Options` and `Content-Security-Policy` response headers from subframes so that AI chat websites can be loaded in iframes. This modifies network responses locally; no request data is collected or transmitted.

**`tabs`** — Used to read the current tab's URL/title for quick-prompt variables (`{url}`, `{title}`, `{html}`) and to open the project's GitHub page. No tab data is collected.

**`contextMenus`** — Adds a "Ask AI with selected text" right-click menu. The selected text is used only to fill a chat input when you click the menu item; it is never stored or transmitted outside the extension.

**Host permissions** (`https://chatgpt.com/*`, `https://chat.deepseek.com/*`, etc.) — Required to embed these sites in iframes within the extension. The extension accesses these URLs only to display them in the side panel; it does not collect, store, or transmit any data from them.

## Data Sharing

AIChats does **not** sell, share, or transmit your data to any third party. All data remains on your device.

## External Websites

AIChats loads third-party AI chat websites (e.g., ChatGPT, DeepSeek, Claude, etc.) in iframes. Those websites operate under their own privacy policies. AIChats is not responsible for the privacy practices of those sites.

## Contact

For questions about this privacy policy, please open an issue at:
https://github.com/syeplz/AIChats/issues

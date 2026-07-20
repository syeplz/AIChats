# Privacy Policy for AIChats

**Last updated:** 2026-06-20

AIChats does **not** collect, store, or transmit any personal data to any server.

## Data Stored Locally

AIChats uses `chrome.storage.local` to store the following data **only on your local device**:

- Your list of enabled/disabled AI chat sites (URLs, labels, icons)
- Your layout preference (columns count)
- Your theme preference (dark/light/system)
- Your custom quick prompts (labels and content)

## Data Accessed

### Permissions Explanation

**`clipboardRead`** — Used **solely** to paste text from your clipboard into a chat input field when you click the paste button within the extension. This permission is activated only on that specific user action. No clipboard data is ever read automatically, stored, or transmitted outside the extension.

**`storage`** — Used to persist your preferences (chat site list, theme, layout, quick prompts) locally via `chrome.storage.local`. Data is never sent to any AIChats server.

**`sidePanel`** — Used to open the extension in Chrome's side panel. No data is collected.

**`declarativeNetRequest`** — Used to remove `X-Frame-Options` and `Content-Security-Policy` response headers from subframes so that AI chat websites can be loaded in iframes. This modifies network responses locally; no request data is collected or transmitted.

**`tabs`** — Used to open the standalone grid view in a new tab or focus an existing one. No tab data is collected.

**Host permissions** (`https://chatgpt.com/*`, `https://chat.deepseek.com/*`, etc.) — Required to embed these sites in iframes within the extension. The extension accesses these URLs only to display them in the side panel or grid view; it does not collect, store, or transmit any data from them.

## Data Sharing

AIChats does **not** sell, share, or transmit your data to any third party. All data remains on your device.

## External Websites

AIChats loads third-party AI chat websites (e.g., ChatGPT, DeepSeek, Claude, etc.) in iframes. Those websites operate under their own privacy policies. AIChats is not responsible for the privacy practices of those sites.

## Contact

For questions about this privacy policy, please open an issue at:
https://github.com/syeplz/AIChats/issues

# AIChats

**Embed multiple AI chat websites in a single view** — switch between ChatGPT, DeepSeek, Claude, Kimi, Doubao and more from Chrome's side panel or a standalone grid view, with smart quick prompts to speed up your workflow.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/bflhgadnamnmpcpjhgcimnioelhbacpd)
[![GitHub stars](https://img.shields.io/github/stars/syeplz/AIChats?style=social)](https://github.com/syeplz/AIChats)

> **Other languages:** [简体中文](docs/readme/README.zh_CN.md)

---

## Features

### Side Panel
Open AI chats in Chrome's side panel with a dropdown to instantly switch between sites. Includes a refresh button to reload the current chat and a GitHub button to visit the project repo. No need to juggle tabs.

### Grid View
Launch multiple AI chats simultaneously in a full-page gallery view. Scroll-snapping per screen for easy comparison across different models. Each cell has its own refresh and "open in new tab" buttons, with an error overlay and fallback option when a site fails to load.

### Quick Prompts
Pre-built template prompts that auto-fill with your current page context. Supports `{url}`, `{title}`, `{clipboard}` and `{html}` variables — click a chip to copy the expanded prompt to your clipboard. When a chat site has the inject script enabled, the prompt is also automatically filled into the chat input box, and optionally auto-submitted.

### Customizable
- Add any AI chat website you like, or pick from **10 pre-configured templates**: ChatGPT, DeepSeek, Claude, Kimi, Doubao, Gemini, Perplexity, Grok, Tongyi Qianwen, Wenxin Yiyan
- Rearrange and toggle sites on/off
- Per-site settings: toggle script injection and Enter-to-submit behavior
- Create your own quick prompt templates
- Per-prompt settings: toggle input filling and auto-submit behavior
- Adjustable grid columns (1–4) for the standalone view
- Custom favicon auto-detection

### Built-in Prompts
7 ready-to-use prompt templates (4 in English, 7 in Chinese):

| Prompt | Description |
|---|---|
| Analyze Page | Comprehensive webpage analysis with structured output |
| Analyze Clipboard | Adaptive clipboard analysis for short or regular content |
| Translate Clipboard | Translate clipboard content to your target language |
| Diagnose | Structured technical problem diagnosis |
| Polish & Translate | Polish Chinese text and generate an English version *(Chinese only)* |
| Reply | Draft a reply to clipboard content *(Chinese only)* |
| Reply Plus | Enhanced reply assistant with configuration support *(Chinese only)* |

### Themes
Dark (default), Light, or follow your system preference.

### i18n
English and Simplified Chinese with a runtime language switcher.

---

## Installation

### From Chrome Web Store
[Install from Chrome Web Store](https://chromewebstore.google.com/detail/bflhgadnamnmpcpjhgcimnioelhbacpd)

### Manual (Developer Mode)
1. Download or clone this repository:
   ```bash
   git clone https://github.com/syeplz/AIChats.git
   ```
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `AIChats` folder

---

## Usage

1. Click the AIChats icon in the Chrome toolbar to open the side panel
2. Use the dropdown to switch between AI chat sites
3. Click the **⊞** button to open the grid view with all enabled sites
4. Use the **Quick Prompts** chips to copy pre-built prompts to your clipboard (and auto-fill them into the chat when supported)
5. Right-click the icon and select **Options** to customize sites, prompts, layout, and theme

---

## Screenshots

| Side Panel |
|---|
| ![Side Panel](assets/en/sidebar.png) |

---

## Privacy

AIChats does **not** collect, store, or transmit any personal data. All data is stored locally via `chrome.storage.local`. See [PRIVACY.md](PRIVACY.md) for details.

---

## License

[MIT](LICENSE)

---

## Contributing

Contributions are welcome! Please open an [issue](https://github.com/syeplz/AIChats/issues) or submit a pull request.

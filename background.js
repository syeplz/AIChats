async function autoDetectFavicon(siteUrl) {
  let url;
  try { url = new URL(siteUrl); } catch { return ''; }
  const origin = url.origin;

  const htmlCandidates = [];
  try {
    const resp = await fetch(origin, { signal: AbortSignal.timeout(4000) });
    if (resp.ok) {
      const html = await resp.text();
      const patterns = [
        /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/ig,
        /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/ig,
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/ig,
      ];
      for (const pat of patterns) {
        let m;
        while ((m = pat.exec(html)) !== null) {
          const href = m[1];
          htmlCandidates.push(href.startsWith('http') ? href : new URL(href, origin).href);
        }
      }
    }
  } catch {}

  for (const c of htmlCandidates) {
    try {
      const r = await fetch(c, { method: 'HEAD', signal: AbortSignal.timeout(2000) });
      if (r.ok) return c;
    } catch {}
  }

  const fallbacks = [`${origin}/favicon.ico`, `${origin}/favicon.svg`, `${origin}/favicon-32x32.png`];
  for (const c of fallbacks) {
    try {
      const r = await fetch(c, { method: 'HEAD', signal: AbortSignal.timeout(2000) });
      if (r.ok) return c;
    } catch {}
  }
  return '';
}

chrome.runtime.onInstalled.addListener(async () => {
  const { chats } = await chrome.storage.sync.get('chats');
  if (!chats) {
    const defaults = [
      { id: 'chatgpt',  name: 'ChatGPT', url: 'https://chat.openai.com',        enabled: true },
      { id: 'deepseek', name: 'DeepSeek',url: 'https://chat.deepseek.com',       enabled: true },
      { id: 'claude',   name: 'Claude',  url: 'https://claude.ai',               enabled: true },
      { id: 'kimi',     name: 'Kimi',    url: 'https://kimi.moonshot.cn',        enabled: false },
      { id: 'doubao',   name: '豆包',     url: 'https://www.doubao.com/chat',     enabled: false },
    ];
    const icons = await Promise.all(defaults.map(d => autoDetectFavicon(d.url)));
    const withIcons = defaults.map((d, i) => ({
      ...d,
      icon: icons[i] || `https://${new URL(d.url).hostname}/favicon.ico`,
    }));
    await chrome.storage.sync.set({ chats: withIcons, columns: 2, sidebarChat: 'chatgpt', theme: 'system' });
  }
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.action === 'openStandalone') {
    const url = chrome.runtime.getURL('standalone.html');
    const allTabs = await chrome.tabs.query({});
    const existing = allTabs.find(t => t.url === url);
    if (existing) {
      await chrome.tabs.highlight({ windowId: existing.windowId, tabs: existing.index });
      await chrome.windows.update(existing.windowId, { focused: true });
    } else {
      const tab = await chrome.tabs.create({ url });
      await chrome.tabs.update(tab.id, { autoDiscardable: false });
    }
  }
});
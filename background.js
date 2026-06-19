importScripts('store.js');

chrome.runtime.onInstalled.addListener(async () => {
  const chats = await store.get('chats');
  if (!chats) {
    const defaults = [
      { id: 'chatgpt',  name: 'ChatGPT', url: 'https://chat.openai.com',        icon: 'https://chat.openai.com/favicon.ico',    enabled: true },
      { id: 'deepseek', name: 'DeepSeek',url: 'https://chat.deepseek.com',       icon: 'https://chat.deepseek.com/favicon.ico',   enabled: true },
      { id: 'claude',   name: 'Claude',  url: 'https://claude.ai',               icon: 'https://claude.ai/favicon.ico',           enabled: true },
      { id: 'kimi',     name: 'Kimi',    url: 'https://kimi.moonshot.cn',        icon: 'https://kimi.moonshot.cn/favicon.ico',    enabled: false },
      { id: 'doubao',   name: '豆包',     url: 'https://www.doubao.com/chat',     icon: 'https://www.doubao.com/favicon.ico',      enabled: false },
    ];
    await store.set('chats', defaults);
    await store.set('columns', 2);
    await store.set('sidebarChat', 'chatgpt');
    await store.set('theme', 'system');
    await store.set('prompts', [
      { id: 'p_intro', isDefault: true, label: '介绍这个页面', content: '请用中文介绍我当前正在浏览的这个页面 {url} 是做什么的，包括它的主要功能和用途。' },
      { id: 'p_summarize', isDefault: true, label: '总结一下', content: '请总结 {title} ({url}) 的核心内容。' },
      { id: 'p_whatis', isDefault: true, label: '这个 URL 是什么', content: '请解释 {url} 这个页面是关于什么的，以及它的核心功能和使用场景。' },
      { id: 'p_clipboard', isDefault: true, label: '分析剪贴板', content: '请分析以下内容：{clipboard}' },
    ]);
  }
  if (!(await store.get('prompts'))) {
    await store.set('prompts', [
      { id: 'p_intro', isDefault: true, label: '介绍这个页面', content: '请用中文介绍我当前正在浏览的这个页面 {url} 是做什么的，包括它的主要功能和用途。' },
      { id: 'p_summarize', isDefault: true, label: '总结一下', content: '请总结 {title} ({url}) 的核心内容。' },
      { id: 'p_whatis', isDefault: true, label: '这个 URL 是什么', content: '请解释 {url} 这个页面是关于什么的，以及它的核心功能和使用场景。' },
      { id: 'p_clipboard', isDefault: true, label: '分析剪贴板', content: '请分析以下内容：{clipboard}' },
    ]);
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
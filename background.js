importScripts('store.js');

async function updateChatScripts() {
  const chats = await store.get('chats') || [];
  const targets = chats.filter(c => c.enabled && c.inject);
  try { await chrome.scripting.unregisterContentScripts({ ids: ['aichats-content'] }); } catch {}
  if (targets.length === 0) return;
  const matches = targets.map(c => {
    const url = c.url.endsWith('/') ? c.url : c.url + '/';
    return url + '*';
  });
  try {
    await chrome.scripting.registerContentScripts([{
      id: 'aichats-content',
      js: ['content.js'],
      matches,
      runAt: 'document_idle',
      allFrames: true,
    }]);
  } catch (e) { console.error('registerContentScripts error:', e); }
}

chrome.runtime.onInstalled.addListener(async () => {
  const chats = await store.get('chats');
  if (!chats) {
    const defaults = [
      { id: 'chatgpt',  name: 'ChatGPT', url: 'https://chatgpt.com',            icon: 'https://chatgpt.com/favicon.ico',    enabled: true, submitByEnter: true },
      { id: 'deepseek', name: 'DeepSeek',url: 'https://chat.deepseek.com',       icon: 'https://chat.deepseek.com/favicon.ico',   enabled: true, submitByEnter: true },
      { id: 'claude',   name: 'Claude',  url: 'https://claude.ai',               icon: 'https://claude.ai/favicon.ico',           enabled: true, submitByEnter: false },
      { id: 'kimi',     name: 'Kimi',    url: 'https://kimi.moonshot.cn',        icon: 'https://kimi.moonshot.cn/favicon.ico',    enabled: false, submitByEnter: true },
      { id: 'doubao',   name: '豆包',     url: 'https://www.doubao.com/chat',     icon: 'https://www.doubao.com/favicon.ico',      enabled: false, submitByEnter: true },
    ];
    await store.set('chats', defaults);
    await store.set('columns', 2);
    await store.set('sidebarChat', 'chatgpt');
    await store.set('theme', 'system');
    await store.set('prompts', [
      { id: 'p_intro', isDefault: true, enabled: true, label: '介绍这个页面', content: '请用中文介绍我当前正在浏览的这个页面 {url} 是做什么的，包括它的主要功能和用途。' },
      { id: 'p_summarize', isDefault: true, enabled: true, label: '总结一下', content: '请总结 {title} ({url}) 的核心内容。' },
      { id: 'p_whatis', isDefault: true, enabled: true, label: '这个 URL 是什么', content: '请解释 {url} 这个页面是关于什么的，以及它的核心功能和使用场景。' },
      { id: 'p_clipboard', isDefault: true, enabled: true, label: '分析剪贴板', content: '请分析以下内容：{clipboard}' },
      { id: 'p_translate', isDefault: true, enabled: true, label: '翻译剪贴板', content: '请将以下内容翻译成中文：{clipboard}' },
    ]);
  }
  if (!(await store.get('prompts'))) {
    await store.set('prompts', [
      { id: 'p_intro', isDefault: true, enabled: true, label: '介绍这个页面', content: '请用中文介绍我当前正在浏览的这个页面 {url} 是做什么的，包括它的主要功能和用途。' },
      { id: 'p_summarize', isDefault: true, enabled: true, label: '总结一下', content: '请总结 {title} ({url}) 的核心内容。' },
      { id: 'p_whatis', isDefault: true, enabled: true, label: '这个 URL 是什么', content: '请解释 {url} 这个页面是关于什么的，以及它的核心功能和使用场景。' },
      { id: 'p_clipboard', isDefault: true, enabled: true, label: '分析剪贴板', content: '请分析以下内容：{clipboard}' },
      { id: 'p_translate', isDefault: true, enabled: true, label: '翻译剪贴板', content: '请将以下内容翻译成中文：{clipboard}' },
    ]);
  }
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await updateChatScripts();
});

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.action === 'updateContentScripts') {
    await updateChatScripts();
  } else if (msg.action === 'openStandalone') {
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
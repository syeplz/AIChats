chrome.runtime.onInstalled.addListener(async () => {
  const { chats } = await chrome.storage.sync.get('chats');
  if (!chats) {
    const defaults = [
      { id: 'chatgpt',  name: 'ChatGPT', url: 'https://chat.openai.com',        icon: 'https://chat.openai.com/favicon.ico',    enabled: true },
      { id: 'deepseek', name: 'DeepSeek',url: 'https://chat.deepseek.com',       icon: 'https://chat.deepseek.com/favicon.ico',   enabled: true },
      { id: 'claude',   name: 'Claude',  url: 'https://claude.ai',               icon: 'https://claude.ai/favicon.ico',           enabled: true },
      { id: 'kimi',     name: 'Kimi',    url: 'https://kimi.moonshot.cn',        icon: 'https://kimi.moonshot.cn/favicon.ico',    enabled: false },
      { id: 'doubao',   name: '豆包',     url: 'https://www.doubao.com/chat',     icon: 'https://www.doubao.com/favicon.ico',      enabled: false },
    ];
    await chrome.storage.sync.set({ chats: defaults, columns: 2, sidebarChat: 'chatgpt' });
  }
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
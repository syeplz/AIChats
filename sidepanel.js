const DEFAULT_CHATS = [
  { id: 'chatgpt',  name: 'ChatGPT',  url: 'https://chat.openai.com',        icon: 'https://chat.openai.com/favicon.ico',    enabled: true },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com',       icon: 'https://chat.deepseek.com/favicon.ico',   enabled: true },
  { id: 'claude',   name: 'Claude',   url: 'https://claude.ai',               icon: 'https://claude.ai/favicon.ico',           enabled: true },
  { id: 'kimi',     name: 'Kimi',     url: 'https://kimi.moonshot.cn',        icon: 'https://kimi.moonshot.cn/favicon.ico',    enabled: false },
  { id: 'doubao',   name: '豆包',      url: 'https://www.doubao.com/chat',     icon: 'https://www.doubao.com/favicon.ico',      enabled: false },
];

let currentChatId = null;

const select = document.getElementById('chatSelect');
const frame = document.getElementById('chatFrame');

async function loadConfig() {
  const { chats, sidebarChat } = await chrome.storage.sync.get(['chats', 'sidebarChat']);
  const enabled = (chats || DEFAULT_CHATS).filter(c => c.enabled);

  select.innerHTML = '';

  if (enabled.length === 0) {
    select.innerHTML = '<option value="">— 无聊天站 —</option>';
    frame.src = 'about:blank';
    frame.hidden = true;
    document.getElementById('emptyState').hidden = false;
    return;
  }
  frame.hidden = false;
  document.getElementById('emptyState').hidden = true;

  const currentVal = select.value || sidebarChat || enabled[0].id;
  const hasCurrent = enabled.some(c => c.id === currentVal);
  const targetId = hasCurrent ? currentVal : enabled[0].id;

  enabled.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });

  select.value = targetId;
  loadChatDirect(targetId);
}

async function loadChatDirect(id) {
  const data = await chrome.storage.sync.get(['chats']);
  const all = data.chats || DEFAULT_CHATS;
  const chat = all.find(c => c.id === id);
  if (!chat) return;
  currentChatId = id;
  frame.src = chat.url;
}

select.addEventListener('change', () => {
  loadChatDirect(select.value);
  chrome.storage.sync.set({ sidebarChat: select.value });
});

document.getElementById('btnExpand').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('standalone.html') });
});

document.getElementById('btnSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('btnSidebarOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

async function init() {
  await loadConfig();

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.chats || changes.sidebarChat) {
      loadConfig();
    }
  });
}

init();

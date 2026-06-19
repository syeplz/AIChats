const DEFAULT_CHATS = [
  { id: 'chatgpt',  name: 'ChatGPT',  url: 'https://chat.openai.com',        icon: 'https://chat.openai.com/favicon.ico',    enabled: true },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com',       icon: 'https://chat.deepseek.com/favicon.ico',   enabled: true },
  { id: 'claude',   name: 'Claude',   url: 'https://claude.ai',               icon: 'https://claude.ai/favicon.ico',           enabled: true },
  { id: 'kimi',     name: 'Kimi',     url: 'https://kimi.moonshot.cn',        icon: 'https://kimi.moonshot.cn/favicon.ico',    enabled: false },
  { id: 'doubao',   name: '豆包',      url: 'https://www.doubao.com/chat',     icon: 'https://www.doubao.com/favicon.ico',      enabled: false },
];

let allChats = [];
let currentChatId = null;
let ready = false;

const select = document.getElementById('chatSelect');
const frame = document.getElementById('chatFrame');

async function loadConfig() {
  const { chats, sidebarChat } = await chrome.storage.sync.get(['chats', 'sidebarChat']);
  allChats = chats || DEFAULT_CHATS;
  const enabled = allChats.filter(c => c.enabled);

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

function loadChatDirect(id) {
  if (currentChatId === id) return;
  const chat = allChats.find(c => c.id === id);
  if (!chat) return;
  currentChatId = id;
  frame.src = chat.url;
}

select.addEventListener('change', () => {
  loadChatDirect(select.value);
  chrome.storage.sync.set({ sidebarChat: select.value });
});

document.getElementById('btnExpand').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ action: 'openStandalone' });
  window.close();
});

document.getElementById('btnSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('btnSidebarOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

async function handleTabSwitch() {
  if (!ready) return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.url) return;

  const enabled = allChats.filter(c => c.enabled);
  const matched = enabled.find(c => tab.url.startsWith(c.url));

  if (!matched) {
    window.close();
  }
}

async function updateThemeSelect() {
  const sel = document.getElementById('themeSelect');
  const { theme } = await chrome.storage.sync.get('theme');
  sel.value = theme || 'system';
}

async function init() {
  await loadConfig();
  await initTheme();
  updateThemeSelect();

  document.getElementById('themeSelect').addEventListener('change', async (e) => {
    await setTheme(e.target.value);
  });
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.theme) updateThemeSelect();
  });

  ready = true;

  chrome.tabs.onActivated.addListener(handleTabSwitch);

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.chats || changes.sidebarChat) {
      loadConfig();
    }
  });
}

init();

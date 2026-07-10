const DEFAULT_CHATS = [
  { id: 'chatgpt',  name: 'ChatGPT',  url: 'https://chatgpt.com',            icon: 'https://chatgpt.com/favicon.ico',        enabled: true },
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
  const [chats, sidebarChat] = await Promise.all([
    store.get('chats'),
    store.get('sidebarChat'),
  ]);
  allChats = chats || DEFAULT_CHATS;
  const enabled = allChats.filter(c => c.enabled);

  select.innerHTML = '';

  if (enabled.length === 0) {
    select.innerHTML = `<option value="">${_('sidepanel_noChat')}</option>`;
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
  store.set('sidebarChat', select.value);
});

document.getElementById('btnRefresh').addEventListener('click', () => {
  frame.src = frame.src;
});

document.getElementById('btnExpand').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'openStandalone' });
});

document.getElementById('btnSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('btnSidebarOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

async function updateThemeSelect() {
  const sel = document.getElementById('themeSelect');
  sel.value = await store.get('theme') || 'system';
}

const chipBar = document.getElementById('chipBar');

async function renderChips(prompts) {
  if (!Array.isArray(prompts)) prompts = await store.get('prompts') || [];
  prompts = prompts.filter(p => p.enabled !== false);
  if (prompts.length === 0) {
    chipBar.hidden = true;
    return;
  }
  chipBar.hidden = false;
  chipBar.innerHTML = '';
  prompts.forEach(p => {
    const resolved = localizePrompt(p);
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = resolved.label;
    chip.addEventListener('click', async () => {
      let clipboardText = '';
      try {
        clipboardText = await navigator.clipboard.readText();
      } catch {}
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const url = tab?.url || '';
      const title = tab?.title || '';
      const text = resolved.content.replace(/\{url\}/g, url).replace(/\{title\}/g, title).replace(/\{clipboard\}/g, clipboardText);
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      if (p.fillInput !== false) {
        const iframe = document.getElementById('chatFrame');
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({
            source: 'aichats-chipbar',
            type: 'fill-input',
            text,
            autoSubmit: p.autoSubmit !== false
          }, '*');
        }
      }
      chip.classList.add('copied');
      chip.textContent = _('sidepanel_promptCopied');
      setTimeout(() => {
        chip.textContent = resolved.label;
        chip.classList.remove('copied');
      }, 1200);
    });
    chipBar.appendChild(chip);
  });
}

async function init() {
  await initI18n();
  translatePage();
  await loadConfig();
  await initTheme();
  updateThemeSelect();
  await renderChips();

  document.getElementById('themeSelect').addEventListener('change', async (e) => {
    await setTheme(e.target.value);
  });
  store.subscribe('theme', updateThemeSelect);

  const localeSelect = document.getElementById('localeSelect');
  localeSelect.value = await store.get('locale') || 'zh_CN';
  localeSelect.addEventListener('change', async (e) => {
    await store.set('locale', e.target.value);
    location.reload();
  });

  ready = true;

  store.subscribe('chats', loadConfig);
  store.subscribe('sidebarChat', loadConfig);
  store.subscribe('prompts', renderChips);
}

init();

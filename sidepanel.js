const DEFAULT_CHATS = [
  { id: 'chatgpt',  name: 'ChatGPT',  url: 'https://chatgpt.com',            icon: '',  enabled: true },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com',       icon: '',  enabled: true },
  { id: 'claude',   name: 'Claude',   url: 'https://claude.ai',               icon: '',  enabled: true },
  { id: 'kimi',     name: 'Kimi',     url: 'https://kimi.moonshot.cn',        icon: '',  enabled: false },
  { id: 'doubao',   name: '豆包',      url: 'https://www.doubao.com/chat',     icon: '',  enabled: false },
];

let allChats = [];
let currentChatId = null;
let ready = false;

const chatSelect = document.getElementById('chatSelect');
const chatSelectTrigger = document.getElementById('chatSelectTrigger');
const chatSelectDropdown = document.getElementById('chatSelectDropdown');
const frame = document.getElementById('chatFrame');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingLabel = document.getElementById('loadingLabel');
const loadingLogo = document.getElementById('loadingLogo');

function createAIBadge() {
  const span = document.createElement('span');
  span.className = 'ai-badge';
  span.textContent = 'AI';
  return span;
}

function createLogoHTML(chat) {
  if (!chat.icon) return createAIBadge();
  const img = document.createElement('img');
  img.className = 'chat-logo';
  img.src = chat.icon;
  img.alt = '';
  img.loading = 'lazy';
  return img;
}

function renderTrigger(chat) {
  chatSelectTrigger.innerHTML = '';
  chatSelectTrigger.appendChild(createLogoHTML(chat));
  const nameSpan = document.createElement('span');
  nameSpan.className = 'chat-name';
  nameSpan.textContent = chat.name;
  chatSelectTrigger.appendChild(nameSpan);
  chatSelectTrigger.insertAdjacentHTML('beforeend',
    '<svg class="arrow" width="10" height="10" viewBox="0 0 12 12"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>');
}

function closeDropdown() {
  chatSelect.classList.remove('open');
}

async function loadConfig() {
  const [chats, sidebarChat] = await Promise.all([
    store.get('chats'),
    store.get('sidebarChat'),
  ]);
  allChats = chats || DEFAULT_CHATS;
  const enabled = allChats.filter(c => c.enabled);

  chatSelectDropdown.innerHTML = '';

  if (enabled.length === 0) {
    chatSelectTrigger.innerHTML = '<span class="chat-name" style="color:var(--text-muted)">' + _('sidepanel_noChat') + '</span>';
    frame.src = 'about:blank';
    frame.hidden = true;
    document.getElementById('emptyState').hidden = false;
    return;
  }
  frame.hidden = false;
  document.getElementById('emptyState').hidden = true;

  const currentVal = currentChatId || sidebarChat || enabled[0].id;
  const hasCurrent = enabled.some(c => c.id === currentVal);
  const targetId = hasCurrent ? currentVal : enabled[0].id;

  enabled.forEach(c => {
    const opt = document.createElement('div');
    opt.className = 'custom-select-option' + (c.id === targetId ? ' active' : '');
    opt.dataset.id = c.id;
    opt.innerHTML = '';
    opt.appendChild(createLogoHTML(c));
    const nameSpan = document.createElement('span');
    nameSpan.className = 'chat-name';
    nameSpan.textContent = c.name;
    opt.appendChild(nameSpan);
    opt.addEventListener('click', () => {
      selectChat(c.id);
      closeDropdown();
    });
    chatSelectDropdown.appendChild(opt);
  });

  const targetChat = enabled.find(c => c.id === targetId);
  renderTrigger(targetChat);
  loadChatDirect(targetId);
}

function selectChat(id) {
  chatSelectDropdown.querySelectorAll('.custom-select-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.id === id);
  });
  const chat = allChats.find(c => c.id === id);
  if (chat) renderTrigger(chat);
  loadChatDirect(id);
  store.set('sidebarChat', id);
}

function hideLoading() {
  loadingOverlay.classList.add('fade-out');
  setTimeout(() => {
    loadingOverlay.hidden = true;
    loadingOverlay.classList.remove('fade-out');
  }, 250);
}

function loadChatDirect(id) {
  if (currentChatId === id) return;
  const chat = allChats.find(c => c.id === id);
  if (!chat) return;
  currentChatId = id;

  loadingLogo.innerHTML = '';
  if (chat.icon) {
    const img = document.createElement('img');
    img.src = chat.icon;
    img.alt = '';
    img.width = 40;
    img.height = 40;
    img.addEventListener('error', () => {
      const badge = document.createElement('span');
      badge.className = 'ai-badge-lg';
      badge.textContent = 'AI';
      img.replaceWith(badge);
    }, { once: true });
    loadingLogo.appendChild(img);
  } else {
    const badge = document.createElement('span');
    badge.className = 'ai-badge-lg';
    badge.textContent = 'AI';
    loadingLogo.appendChild(badge);
  }
  loadingLabel.textContent = chat.name;
  loadingOverlay.hidden = false;
  loadingOverlay.classList.remove('fade-out');

  frame.src = chat.url;
}

frame.addEventListener('load', () => {
  if (!loadingOverlay.hidden) hideLoading();
});

chatSelectTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  chatSelect.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (!chatSelect.contains(e.target)) closeDropdown();
});

window.addEventListener('blur', closeDropdown);

document.getElementById('btnRefresh').addEventListener('click', () => {
  frame.src = frame.src;
});

document.getElementById('btnExpand').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'openStandalone' });
});

document.getElementById('btnSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('btnGithub').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://github.com/syeplz/AIChats' });
});

document.getElementById('btnSidebarOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

async function updateThemeSelect() {
  const sel = document.getElementById('themeSelect');
  sel.value = await store.get('theme') || 'system';
}

const chipBar = document.getElementById('chipBar');

// Clipboard guard: keep the user's clipboard from being polluted by our own prompt writes.
const CLIPBOARD_GUARD_KEY = 'clipboardGuard';
let cbGuard = { saved: null, lastWritten: null, gen: 0 };
let pendingGen = null;
let pendingTimer = null;

async function loadClipboardGuard() {
  try {
    const stored = await chrome.storage.session.get(CLIPBOARD_GUARD_KEY) || {};
    const guard = stored[CLIPBOARD_GUARD_KEY] || {};
    cbGuard = {
      saved: guard.saved ?? null,
      lastWritten: guard.lastWritten ?? null,
      gen: guard.gen || 0,
    };
  } catch {}
}

function saveClipboardGuard() {
  try { chrome.storage.session.set({ [CLIPBOARD_GUARD_KEY]: cbGuard }); } catch {}
}

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

async function readClipboardSafe() {
  try { return await navigator.clipboard.readText(); } catch { return null; }
}

// Read the clipboard for template expansion. If the live clipboard still holds our own
// last write (a copy-only residue), substitute the saved user content instead.
async function snapshotClipboard() {
  const live = await readClipboardSafe();
  if (cbGuard.lastWritten !== null && live === cbGuard.lastWritten) {
    return { clipboardText: cbGuard.saved || '', snapshotOk: cbGuard.saved !== null, dirty: true };
  }
  cbGuard.saved = live;
  cbGuard.lastWritten = null;
  return { clipboardText: live || '', snapshotOk: live !== null, dirty: false };
}

window.addEventListener('message', async (event) => {
  const data = event.data;
  if (!data || data.source !== 'aichats-content' || data.type !== 'fill-input-ack') return;
  if (event.source !== frame.contentWindow || pendingGen === null || data.gen !== pendingGen) return;
  pendingGen = null;
  clearTimeout(pendingTimer);
  if (cbGuard.saved === null) return;
  const live = await readClipboardSafe();
  if (live !== cbGuard.lastWritten) {
    console.log('[AIChats] fill-input-ack: clipboard changed externally, skip restore');
    return;
  }
  await writeClipboard(cbGuard.saved);
  cbGuard.lastWritten = null;
  saveClipboardGuard();
  console.log('[AIChats] fill-input-ack: clipboard restored');
});

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
    if (!resolved) return;
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = resolved.label;
    chip.addEventListener('click', async () => {
      const content = resolved.content;
      const needUrl = /\{url\}/.test(content);
      const needTitle = /\{title\}/.test(content);
      const needClipboard = /\{clipboard\}/.test(content);
      const needHtml = /\{html\}/.test(content);

      let url = '', title = '', clipboardText = '', html = '';

      if (needUrl || needTitle || needHtml) {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        url = tab?.url || '';
        title = tab?.title || '';
        if (needHtml && tab?.id && url) {
          try {
            const origin = new URL(url).origin + '/*';
            const has = await chrome.permissions.contains({ origins: [origin] });
            if (!has) {
              const granted = await chrome.permissions.request({ origins: [origin] });
              if (!granted) {
                alert(_('permission_html_required'));
                return;
              }
            }
            const [result] = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => document.documentElement.outerHTML,
            });
            html = result?.result || '';
          } catch (e) {
            console.warn('[AIChats] {html} fetch failed:', e.message);
          }
        }
      }

      const snap = await snapshotClipboard();
      if (snap.dirty && snap.snapshotOk) {
        await writeClipboard(cbGuard.saved);
      }
      if (needClipboard) clipboardText = snap.clipboardText;

      const text = content.replace(/\{url\}/g, url).replace(/\{title\}/g, title).replace(/\{clipboard\}/g, clipboardText).replace(/\{html\}/g, html);

      cbGuard.gen += 1;
      const gen = cbGuard.gen;

      let wrote = false;
      if (snap.snapshotOk) {
        wrote = await writeClipboard(text);
        if (wrote) cbGuard.lastWritten = text;
      }
      saveClipboardGuard();
      console.log('[AIChats] chip click: prompt=' + resolved.label, 'fillInput=' + (p.fillInput !== false), 'autoSubmit=' + (p.autoSubmit !== false), 'text.length=' + text.length, 'clipboardWrite=' + (wrote ? 'OK' : 'skipped'));

      if (p.fillInput !== false) {
        const iframe = document.getElementById('chatFrame');
        if (iframe?.contentWindow) {
          const chat = allChats.find(c => c.id === currentChatId);
          iframe.contentWindow.postMessage({
            source: 'aichats-chipbar',
            type: 'fill-input',
            text,
            autoSubmit: p.autoSubmit !== false,
            submitByEnter: chat?.submitByEnter === true,
            gen,
          }, '*');
          console.log('[AIChats] postMessage sent, gen=' + gen, 'submitByEnter=' + (chat?.submitByEnter === true));
          pendingGen = gen;
          clearTimeout(pendingTimer);
          pendingTimer = setTimeout(() => { if (pendingGen === gen) pendingGen = null; }, 800);
        } else {
          console.warn('[AIChats] postMessage skipped: iframe not ready');
        }
      } else {
        console.log('[AIChats] fillInput disabled, skip postMessage');
      }

      if (!wrote) {
        chip.textContent = _('sidepanel_clipboardSkipped');
        chip.classList.add('copied');
        setTimeout(() => {
          chip.textContent = resolved.label;
          chip.classList.remove('copied');
        }, 2000);
      } else {
        chip.classList.add('copied');
        chip.textContent = _('sidepanel_promptCopied');
        setTimeout(() => {
          chip.textContent = resolved.label;
          chip.classList.remove('copied');
        }, 1200);
      }
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
  await loadClipboardGuard();
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

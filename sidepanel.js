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
const chatFrames = document.getElementById('chatFrames');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingLabel = document.getElementById('loadingLabel');
const loadingLogo = document.getElementById('loadingLogo');

// Keep-alive frames: one lazily-created iframe per chat, kept alive across
// switches so drafts and conversations survive.
const frameByChat = new Map();

const SNAP_KEY = 'aichats-snapshot';

function getActiveFrame() {
  for (const iframe of frameByChat.values()) {
    if (!iframe.hidden) return iframe;
  }
  return null;
}

function getActiveChatId() {
  return getActiveFrame()?.dataset.chatId || null;
}

function hideAllFrames() {
  for (const iframe of frameByChat.values()) iframe.hidden = true;
}

function createFrame(chat) {
  const iframe = document.createElement('iframe');
  iframe.dataset.chatId = chat.id;
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
  iframe.setAttribute('allow', 'clipboard-read; clipboard-write');
  iframe.hidden = true;
  iframe.addEventListener('load', () => {
    if (!iframe.hidden && !loadingOverlay.hidden) hideLoading();
  });
  chatFrames.appendChild(iframe);
  frameByChat.set(chat.id, iframe);
  return iframe;
}

function pruneFrames(enabledIds) {
  for (const [id, iframe] of frameByChat) {
    if (!enabledIds.has(id)) {
      iframe.remove();
      frameByChat.delete(id);
    }
  }
}

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
    hideAllFrames();
    pruneFrames(new Set());
    document.getElementById('emptyState').hidden = false;
    return;
  }
  document.getElementById('emptyState').hidden = true;
  pruneFrames(new Set(enabled.map(c => c.id)));

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

function showLoading(chat) {
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
}

async function resolveFrameSrc(chat) {
  try {
    const res = await chrome.storage.session.get(SNAP_KEY);
    const snap = (res[SNAP_KEY] || {})[new URL(chat.url).origin];
    if (snap && snap.url) return snap.url;
  } catch {}
  return chat.url;
}

function loadChatDirect(id) {
  const chat = allChats.find(c => c.id === id);
  if (!chat) return;
  if (getActiveChatId() === id) return;
  currentChatId = id;

  const isFirstLoad = !frameByChat.has(id);
  const iframe = frameByChat.get(id) || createFrame(chat);

  hideAllFrames();
  iframe.hidden = false;

  if (isFirstLoad) {
    showLoading(chat);
    resolveFrameSrc(chat).then(src => {
      if (getActiveChatId() === id) iframe.src = src;
    });
  }
}

chatSelectTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  chatSelect.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (!chatSelect.contains(e.target)) closeDropdown();
});

window.addEventListener('blur', closeDropdown);

document.getElementById('btnNewChat').addEventListener('click', () => {
  startNewChat();
});

// Navigate the active chat frame to the site's new-chat page and drop the
// saved snapshot, so a fresh session starts (and reopen won't restore the old
// conversation or retry-drop back into it).
function startNewChat() {
  const id = getActiveChatId();
  const chat = allChats.find(c => c.id === id);
  const iframe = getActiveFrame();
  if (!chat || !iframe) return;
  showLoading(chat);
  let origin = null;
  try { origin = new URL(chat.url).origin; } catch {}
  const nav = () => { iframe.src = chat.url; };
  if (!origin) { nav(); return; }
  chrome.storage.session.get(SNAP_KEY).then(res => {
    const all = res[SNAP_KEY] || {};
    if (all[origin]) {
      delete all[origin];
      return chrome.storage.session.set({ [SNAP_KEY]: all });
    }
  }).catch(() => {}).then(nav);
}

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
let pendingFrame = null;

// Re-send a fill-input message until the chat page acks (or we time out).
// A slow chat iframe may miss the first message, so resending is the fix.
// Resends always target the original frame so a chat switch can't misroute them.
const FILL_RETRY_INTERVAL = 800;
const FILL_RETRY_TIMEOUT = 5000;

function scheduleResend(gen, msg, startTime) {
  clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    if (pendingGen !== gen) return;
    if (Date.now() - startTime >= FILL_RETRY_TIMEOUT) {
      pendingGen = null;
      pendingFrame = null;
      console.warn('[AIChats] fill-input: no ack within ' + FILL_RETRY_TIMEOUT + 'ms, give up');
      return;
    }
    const iframe = pendingFrame || getActiveFrame();
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(msg, '*');
      console.log('[AIChats] postMessage retry, gen=' + gen);
    } else {
      console.warn('[AIChats] postMessage retry skipped: iframe not ready');
    }
    scheduleResend(gen, msg, startTime);
  }, FILL_RETRY_INTERVAL);
}

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
  try {
    const items = await navigator.clipboard.read();
    if (items.length === 0) return '';
    for (const item of items) {
      if (item.types.includes('text/plain')) {
        const blob = await item.getType('text/plain');
        return await blob.text();
      }
    }
    return null;
  } catch { return null; }
}

// Read the clipboard for template expansion. If the live clipboard still holds our own
// last write (a copy-only residue), substitute the saved user content instead.
async function snapshotClipboard() {
  const live = await readClipboardSafe();
  if (cbGuard.lastWritten !== null && live === cbGuard.lastWritten) {
    return { clipboardText: cbGuard.saved || '', snapshotOk: cbGuard.saved !== null, dirty: true, clipboardEmpty: false };
  }
  cbGuard.saved = live;
  cbGuard.lastWritten = null;
  return { clipboardText: live || '', snapshotOk: live !== null, dirty: false, clipboardEmpty: live === '' };
}

window.addEventListener('message', async (event) => {
  const data = event.data;
  if (!data || data.source !== 'aichats-content' || data.type !== 'fill-input-ack') return;
  let srcId = null;
  for (const [id, iframe] of frameByChat) {
    if (iframe.contentWindow === event.source) { srcId = id; break; }
  }
  if (srcId === null && pendingFrame?.contentWindow === event.source) {
    srcId = pendingFrame.dataset.chatId || null;
  }
  if (srcId === null || pendingGen === null || data.gen !== pendingGen) return;
  pendingGen = null;
  pendingFrame = null;
  clearTimeout(pendingTimer);
  if (cbGuard.saved === null) return;
  await writeClipboard(cbGuard.saved);
  cbGuard.lastWritten = null;
  saveClipboardGuard();
  console.log('[AIChats] fill-input-ack: clipboard restored');
});

// Expand {url}/{title}/{html} from the active tab. Returns null when the
// {html} permission was denied, so the caller can abort.
async function collectPageVars(content) {
  const needUrl = /\{url\}/.test(content);
  const needTitle = /\{title\}/.test(content);
  const needHtml = /\{html\}/.test(content);
  let url = '', title = '', html = '';
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
            return null;
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
  return { url, title, html };
}

function fillIntoChat(text, autoSubmit) {
  const iframe = getActiveFrame();
  const chat = allChats.find(c => c.id === currentChatId);
  if (!iframe?.contentWindow || !chat) {
    console.warn('[AIChats] fillIntoChat skipped: iframe not ready');
    return;
  }
  cbGuard.gen += 1;
  const gen = cbGuard.gen;
  const msg = {
    source: 'aichats-chipbar',
    type: 'fill-input',
    text,
    autoSubmit,
    submitByEnter: chat.submitByEnter === true,
    gen,
  };
  iframe.contentWindow.postMessage(msg, '*');
  console.log('[AIChats] postMessage sent, gen=' + gen, 'submitByEnter=' + (chat.submitByEnter === true));
  pendingGen = gen;
  pendingFrame = iframe;
  scheduleResend(gen, msg, Date.now());
}

/**
 * Show an animated SVG checkmark with glow on a chip.
 * The SVG is absolutely positioned inside the chip and auto-removes after animation.
 * @param {HTMLElement} chip
 */
function showChipSuccess(chip) {
  chip.classList.add('chip-success');

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');

  const check = document.createElementNS(ns, 'path');
  check.setAttribute('d', 'M5.5 10.8 L8.5 13.8 L14.5 6.8');
  check.classList.add('check');

  svg.appendChild(check);

  const wrapper = document.createElement('span');
  wrapper.className = 'chip-glow';
  wrapper.appendChild(svg);
  chip.appendChild(wrapper);

  wrapper.addEventListener('animationend', (e) => {
    if (e.animationName === 'chipGlowOut') {
      chip.classList.remove('chip-success');
      wrapper.remove();
    }
  });
}

/**
 * Show a floating bubble near a chip. Does not occupy layout space.
 * @param {HTMLElement} chip
 * @param {string} text - message to display
 */
function showFloatBubble(chip, text) {
  const bubble = document.createElement('div');
  bubble.className = 'float-bubble';
  bubble.textContent = `⚠ ${text}`;
  document.body.appendChild(bubble);

  const rect = chip.getBoundingClientRect();
  const bubbleWidth = bubble.getBoundingClientRect().width;
  const half = bubbleWidth / 2;
  const pad = 8;

  let left = rect.left + rect.width / 2 - half;
  if (left + bubbleWidth > window.innerWidth - pad) {
    left = window.innerWidth - bubbleWidth - pad;
  } else if (left < pad) {
    left = pad;
  }
  bubble.style.left = `${left}px`;

  const bubbleHeight = bubble.getBoundingClientRect().height;
  if (rect.bottom + bubbleHeight + 4 > window.innerHeight) {
    bubble.style.top = `${rect.top - bubbleHeight - 4}px`;
  } else {
    bubble.style.top = `${rect.bottom + 4}px`;
  }

  bubble.addEventListener('animationend', (e) => {
    if (e.animationName === 'bubbleOut') bubble.remove();
  });
}

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
      const vars = await collectPageVars(content);
      if (vars === null) return;

      const hasClipboardVar = /\{clipboard\}/.test(content);

      const snap = await snapshotClipboard();
      if (snap.dirty && snap.snapshotOk) {
        await writeClipboard(cbGuard.saved);
      }
      let clipboardText = '';
      if (hasClipboardVar) clipboardText = snap.clipboardText;

      const text = content.replace(/\{url\}/g, vars.url).replace(/\{title\}/g, vars.title).replace(/\{clipboard\}/g, clipboardText).replace(/\{html\}/g, vars.html);

      let wrote = false;
      if (snap.snapshotOk) {
        wrote = await writeClipboard(text);
        if (wrote) cbGuard.lastWritten = text;
      }
      saveClipboardGuard();
      console.log('[AIChats] chip click: prompt=' + resolved.label, 'fillInput=' + (p.fillInput !== false), 'autoSubmit=' + (p.autoSubmit !== false), 'text.length=' + text.length, 'clipboardWrite=' + (wrote ? 'OK' : 'skipped'));

      if (p.fillInput !== false) {
        fillIntoChat(text, p.autoSubmit !== false);
      } else {
        console.log('[AIChats] fillInput disabled, skip postMessage');
      }

      const fillEnabled = p.fillInput !== false;
      if (fillEnabled) {
        if (hasClipboardVar && !snap.snapshotOk) {
          const warnLabel = snap.clipboardEmpty
            ? _('sidepanel_clipboardEmpty')
            : _('sidepanel_clipboardNonText');
          showFloatBubble(chip, warnLabel);
        } else {
          showChipSuccess(chip);
        }
      } else {
        if (wrote) {
          showChipSuccess(chip);
        } else if (hasClipboardVar && !snap.snapshotOk) {
          const warnLabel = snap.clipboardEmpty
            ? _('sidepanel_clipboardEmpty')
            : _('sidepanel_clipboardNonText');
          showFloatBubble(chip, warnLabel);
        } else {
          chip.classList.add('error-flash');
          chip.addEventListener('animationend', () => chip.classList.remove('error-flash'), { once: true });
        }
      }
    });
    chipBar.appendChild(chip);
  });
}

// Right-click context menu handoff: the background writes a pending fill to
// session storage and opens the panel. We consume it either here (fresh panel)
// or via the storage listener (already-open panel).
let pendingFillProcessing = false;

async function handlePendingFill(payload) {
  if (pendingFillProcessing || !payload || !payload.chatId || !payload.text) return;
  pendingFillProcessing = true;
  try {
    const enabled = allChats.filter(c => c.enabled);
    if (enabled.length === 0) return;
    // Panel already open: send to its currently active chat. Fresh panel:
    // currentChatId is the default chat from loadConfig, matching the intent
    // to fall back to the configured default site.
    const activeOk = currentChatId && enabled.some(c => c.id === currentChatId);
    const payloadOk = enabled.some(c => c.id === payload.chatId);
    const chatId = activeOk ? currentChatId : (payloadOk ? payload.chatId : enabled[0].id);
    loadChatDirect(chatId);
    fillIntoChat(payload.text, payload.autoSubmit !== false);
  } finally {
    pendingFillProcessing = false;
  }
}

async function consumePendingFill() {
  try {
    const stored = await chrome.storage.session.get('aichatsPendingFill');
    const payload = stored.aichatsPendingFill || null;
    if (payload) {
      await chrome.storage.session.remove('aichatsPendingFill');
      await handlePendingFill(payload);
    }
  } catch {}
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'session' || !changes.aichatsPendingFill?.newValue) return;
  chrome.storage.session.remove('aichatsPendingFill');
  handlePendingFill(changes.aichatsPendingFill.newValue);
});

async function init() {
  await initI18n();
  translatePage();
  await loadConfig();
  await initTheme();
  updateThemeSelect();
  await loadClipboardGuard();
  await renderChips();
  await consumePendingFill();

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

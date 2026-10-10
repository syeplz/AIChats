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

document.getElementById('btnOpenTab').addEventListener('click', async () => {
  const chat = allChats.find(c => c.id === getActiveChatId());
  if (!chat) return;
  const url = await resolveFrameSrc(chat);
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const opts = { url };
  if (typeof tab?.index === 'number') opts.index = tab.index + 1;
  chrome.tabs.create(opts);
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

/**
 * Execute one quick prompt end-to-end: expand variables → write clipboard →
 * optionally fill the active chat iframe. UI-agnostic so chip clicks, history
 * entries and the compose modal can all share the exact same behavior.
 *
 * @param {Object} opts
 * @param {string} opts.content  raw prompt text, may contain {url}/{title}/{clipboard}/{html}
 * @param {boolean} [opts.fillInput=true]  postMessage the text into the chat iframe
 * @param {boolean} [opts.autoSubmit=true] auto-submit after filling
 * @returns {Promise<{ok:boolean, text?:string, hasClipboardVar?:boolean,
 *   snapOk?:boolean, clipboardEmpty?:boolean, wrote?:boolean, fillEnabled?:boolean}>}
 *   ok=false means aborted (e.g. {html} permission denied); feedback was already shown.
 */
async function runQuickPrompt({ content, fillInput = true, autoSubmit = true }) {
  const vars = await collectPageVars(content);
  if (vars === null) return { ok: false };

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

  if (fillInput) {
    fillIntoChat(text, autoSubmit);
  }

  return { ok: true, text, hasClipboardVar, snapOk: snap.snapshotOk, clipboardEmpty: snap.clipboardEmpty, wrote, fillEnabled: fillInput };
}

/**
 * Render the result of runQuickPrompt on an anchor element (chip, split button…):
 * success glow, clipboard warning bubble, or error flash.
 * @param {HTMLElement} anchor
 * @param {{ok:boolean, hasClipboardVar?:boolean, snapOk?:boolean,
 *   clipboardEmpty?:boolean, wrote?:boolean, fillEnabled?:boolean}} result
 */
function renderPromptFeedback(anchor, result) {
  if (!result.ok) return;
  const { fillEnabled, hasClipboardVar, snapOk, clipboardEmpty, wrote } = result;
  const warnLabel = () => clipboardEmpty ? _('sidepanel_clipboardEmpty') : _('sidepanel_clipboardNonText');
  if (fillEnabled) {
    if (hasClipboardVar && !snapOk) {
      showFloatBubble(anchor, warnLabel());
    } else {
      showChipSuccess(anchor);
    }
  } else {
    if (wrote) {
      showChipSuccess(anchor);
    } else if (hasClipboardVar && !snapOk) {
      showFloatBubble(anchor, warnLabel());
    } else {
      anchor.classList.add('error-flash');
      anchor.addEventListener('animationend', () => anchor.classList.remove('error-flash'), { once: true });
    }
  }
}

async function renderChips(prompts) {
  if (!Array.isArray(prompts)) prompts = await store.get('prompts') || [];
  prompts = prompts.filter(p => p.enabled !== false);
  if (prompts.length === 0) {
    chipBar.hidden = true;
    chipToolbar.hidden = true;
    return;
  }
  chipToolbar.hidden = false;
  chipBar.hidden = false;
  chipBar.innerHTML = '';
  prompts.forEach(p => {
    const resolved = localizePrompt(p);
    if (!resolved) return;
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = resolved.label;
    chip.addEventListener('click', async () => {
      const result = await runQuickPrompt({
        content: resolved.content,
        fillInput: p.fillInput !== false,
        autoSubmit: p.autoSubmit !== false,
      });
      renderPromptFeedback(chip, result);
    });
    chipBar.appendChild(chip);
  });
}

/* ── Manual prompt: compose modal + history + draggable FAB ── */

const HISTORY_KEY = 'manualPromptHistory';
const HISTORY_LIMIT = 30;        // entries kept in storage
const FAB_POS_KEY = 'composeFabPos';
const FAB_DRAG_THRESHOLD = 4;

const composeFab = document.getElementById('composeFab');
const panelBody = document.querySelector('.panel-body');
const chipToolbar = document.getElementById('chipToolbar');
const historyList = document.getElementById('historyList');
const historyNoResults = document.getElementById('historyNoResults');
const historySearchWrap = document.getElementById('historySearchWrap');
const historySearch = document.getElementById('historySearch');
const composeModal = document.getElementById('composeModal');
const composeDialog = document.querySelector('.modal-compose');
const composeHistory = document.querySelector('.compose-history');
const composeText = document.getElementById('composeText');
const composeClose = document.getElementById('composeClose');
const composeSubmit = document.getElementById('composeSubmit');

async function loadHistory() {
  try {
    const list = await store.get(HISTORY_KEY);
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

// Dedupe by exact content (moved to top with a fresh timestamp), cap the list.
async function addHistoryEntry(content) {
  const list = await loadHistory();
  const entry = { content, ts: Date.now() };
  const next = [entry, ...list.filter(e => e.content !== content)].slice(0, HISTORY_LIMIT);
  await store.set(HISTORY_KEY, next);
}

async function removeHistoryEntry(content) {
  const list = await loadHistory();
  await store.set(HISTORY_KEY, list.filter(e => e.content !== content));
}

async function clearHistory() {
  await store.set(HISTORY_KEY, []);
}

/* ── History list (rendered inside the compose modal) ─────── */

let historyEntries = [];   // everything stored, newest first
let historyFiltered = [];  // the subset currently shown (search applied)
let historyActiveIdx = -1; // keyboard selection within historyFiltered
let relTimeFmt = null;

// Locale-aware "3 分钟前 / 3 minutes ago"; falls back to a date for old entries.
function formatRelTime(ts) {
  if (!Number.isFinite(ts)) return '';
  const locale = document.documentElement.lang || 'zh-CN';
  if (!relTimeFmt) {
    try { relTimeFmt = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }); }
    catch { relTimeFmt = new Intl.RelativeTimeFormat('en', { numeric: 'auto' }); }
  }
  const diffSec = Math.round((ts - Date.now()) / 1000); // negative for the past
  const abs = Math.abs(diffSec);
  if (abs < 60) return relTimeFmt.format(diffSec, 'second');
  if (abs < 3600) return relTimeFmt.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return relTimeFmt.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 30) return relTimeFmt.format(Math.round(diffSec / 86400), 'day');
  return new Date(ts).toLocaleDateString(locale);
}

async function renderHistoryList() {
  historyEntries = await loadHistory();
  const query = historySearch.value.trim().toLowerCase();
  const matches = query
    ? historyEntries.filter(e => e.content.toLowerCase().includes(query))
    : historyEntries.slice();
  historyFiltered = matches;

  const hasEntries = historyEntries.length > 0;
  // Hide the whole history block until at least one entry exists; the list
  // itself scrolls past ~10 rows (max-height), never hard-sliced.
  composeHistory.hidden = !hasEntries;
  composeDialog.classList.toggle('no-history', !hasEntries);
  historySearchWrap.hidden = !hasEntries;
  historyNoResults.hidden = !(hasEntries && query && matches.length === 0);

  historyList.innerHTML = '';
  historyActiveIdx = -1;

  historyFiltered.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.title = entry.content;

    const text = document.createElement('span');
    text.className = 'history-item-text';
    text.textContent = entry.content;

    const meta = document.createElement('span');
    meta.className = 'history-item-meta';

    const time = document.createElement('span');
    time.className = 'history-item-time';
    time.textContent = formatRelTime(entry.ts);

    const actions = document.createElement('span');
    actions.className = 'history-item-actions';

    // The whole row already loads the entry into the composer, so no dedicated
    // edit button is needed — only the destructive delete stays here.
    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.title = _('sidepanel_historyDelete');
    btnDel.setAttribute('aria-label', _('sidepanel_historyDelete'));
    btnDel.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
    btnDel.addEventListener('click', async (e) => {
      e.stopPropagation();
      await removeHistoryEntry(entry.content);
      await renderHistoryList();
    });

    actions.appendChild(btnDel);
    meta.appendChild(time);
    meta.appendChild(actions);
    item.appendChild(text);
    item.appendChild(meta);
    item.addEventListener('click', () => loadIntoComposer(entry.content));
    historyList.appendChild(item);
  });

  // Destructive action lives at the end of the list, only while browsing
  // (hidden during a search so it never sits under "no results").
  if (hasEntries && !query) {
    const clearRow = document.createElement('button');
    clearRow.type = 'button';
    clearRow.className = 'history-clear-row';
    clearRow.textContent = _('sidepanel_historyClear');
    clearRow.addEventListener('click', async () => {
      if (!confirm(_('sidepanel_historyClearConfirm'))) return;
      await clearHistory();
      await renderHistoryList();
    });
    historyList.appendChild(clearRow);
  }
}

// Move the keyboard selection within the filtered list (clamped, scrolled into view).
function setHistoryActive(idx) {
  const items = historyList.querySelectorAll('.history-item');
  if (!items.length) return;
  idx = Math.max(0, Math.min(idx, items.length - 1));
  historyActiveIdx = idx;
  items.forEach((el, i) => el.classList.toggle('active', i === idx));
  items[idx].scrollIntoView({ block: 'nearest' });
}

function handleHistoryNavKey(e) {
  if (composeModal.hidden || !historyFiltered.length) return;
  // Let the clear-row button handle its own Enter/Space activation.
  if (e.target.closest?.('.history-clear-row')) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setHistoryActive(historyActiveIdx + 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (historyActiveIdx <= 0) {
      historyActiveIdx = -1;
      historyList.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
    } else {
      setHistoryActive(historyActiveIdx - 1);
    }
  } else if (e.key === 'Enter' && historyActiveIdx >= 0) {
    e.preventDefault();
    loadIntoComposer(historyFiltered[historyActiveIdx].content);
  }
}

historySearch.addEventListener('input', () => renderHistoryList());

historySearch.addEventListener('keydown', (e) => {
  // Let Escape clear the query first instead of closing the modal.
  if (e.key === 'Escape' && historySearch.value) {
    historySearch.value = '';
    renderHistoryList();
    e.stopPropagation();
    return;
  }
  handleHistoryNavKey(e);
});

historyList.addEventListener('keydown', handleHistoryNavKey);

/* ── Compose modal ───────────────────────────────────────── */

let composeSubmitting = false;

const COMPOSER_MAX_LINES = 10;

// Grow the textarea with its content up to ~10 lines, then let it scroll.
function autoGrowComposer() {
  composeText.style.height = 'auto';
  const cs = getComputedStyle(composeText);
  const line = parseFloat(cs.lineHeight) || 20;
  const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const max = line * COMPOSER_MAX_LINES + pad;
  composeText.style.height = Math.min(composeText.scrollHeight, max) + 'px';
  composeText.style.overflowY = composeText.scrollHeight > max ? 'auto' : 'hidden';
}

// The send button dims when there is nothing to send (or while sending).
function updateComposerState() {
  composeSubmit.disabled = composeSubmitting || !composeText.value.trim();
}

async function openComposeModal() {
  historySearch.value = '';
  // Render before showing so the history block never flashes in empty.
  await renderHistoryList();
  composeModal.hidden = false;
  autoGrowComposer();
  updateComposerState();
  composeText.focus();
}

function closeComposeModal() {
  composeModal.hidden = true;
}

// Load a history entry into the composer, confirming before overwriting a draft.
function loadIntoComposer(content) {
  if (composeText.value.trim() && composeText.value !== content) {
    if (!confirm(_('sidepanel_composeOverwrite'))) return;
  }
  composeText.value = content;
  autoGrowComposer();
  updateComposerState();
  composeText.focus();
}

async function submitCompose() {
  if (composeSubmitting) return;
  const content = composeText.value;
  if (!content.trim()) return;
  composeSubmitting = true;
  composeSubmit.disabled = true;
  let result;
  try {
    result = await runQuickPrompt({
      content,
      fillInput: true,
      autoSubmit: true,
    });
  } finally {
    composeSubmitting = false;
    updateComposerState();
  }
  if (!result.ok) return; // aborted (permission denied); keep the draft + modal open
  await addHistoryEntry(content);
  // Submitted: clear the composer. Closing without submitting keeps the draft.
  composeText.value = '';
  autoGrowComposer();
  updateComposerState();
  closeComposeModal();
  renderPromptFeedback(composeFab, result);
}

composeClose.addEventListener('click', closeComposeModal);

composeModal.addEventListener('click', (e) => {
  if (e.target === composeModal) closeComposeModal();
});

composeSubmit.addEventListener('click', submitCompose);

composeText.addEventListener('input', () => {
  autoGrowComposer();
  updateComposerState();
});

composeText.addEventListener('keydown', (e) => {
  // Enter inserts a newline; Ctrl/Cmd+Enter submits.
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    submitCompose();
  }
});

// Variable buttons insert at the cursor / replace the selection.
document.querySelectorAll('.var-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.var || '';
    const start = composeText.selectionStart ?? composeText.value.length;
    const end = composeText.selectionEnd ?? start;
    composeText.setRangeText(v, start, end, 'end');
    // setRangeText() does not fire an input event, so refresh the height and
    // enable the send button explicitly (otherwise a variable-only prompt
    // leaves the send button disabled).
    autoGrowComposer();
    updateComposerState();
    composeText.focus();
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!composeModal.hidden) closeComposeModal();
});

/* ── Draggable compose FAB ───────────────────────────────── */

// Position is stored as a 0–1 ratio of the draggable range so it survives
// side-panel resizes; a fresh (never-dragged) FAB defaults to the right-center.
let fabPos = null;
let fabDrag = null;
let fabSuppressClick = false;

function fabGeometry() {
  const pb = panelBody.getBoundingClientRect();
  const size = composeFab.offsetWidth || 48;
  return {
    pbLeft: pb.left,
    pbTop: pb.top,
    maxX: Math.max(0, pb.width - size),
    maxY: Math.max(0, pb.height - size),
  };
}

// Clamp the stored ratio back into view (also used on panel resize).
function applyFabPos() {
  const { maxX, maxY } = fabGeometry();
  const rx = fabPos ? fabPos.rx : 1;
  const ry = fabPos ? fabPos.ry : 0.5;
  const left = Math.min(Math.max(0, rx * maxX), maxX);
  const top = Math.min(Math.max(0, ry * maxY), maxY);
  composeFab.style.left = `${left}px`;
  composeFab.style.top = `${top}px`;
}

// Transparent shield that swallows pointer events during a drag, so the chat
// iframe underneath never steals them (pointer capture does not cross iframes).
let fabShield = null;

function showFabShield() {
  if (fabShield) return;
  fabShield = document.createElement('div');
  fabShield.className = 'fab-drag-shield';
  panelBody.appendChild(fabShield);
}

function hideFabShield() {
  if (!fabShield) return;
  fabShield.remove();
  fabShield = null;
}

composeFab.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const rect = composeFab.getBoundingClientRect();
  const geo = fabGeometry();
  fabSuppressClick = false;
  fabDrag = {
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    pbLeft: geo.pbLeft,
    pbTop: geo.pbTop,
    moved: false,
  };
  composeFab.setPointerCapture(e.pointerId);
  showFabShield();
});

window.addEventListener('pointermove', (e) => {
  if (!fabDrag || e.pointerId !== fabDrag.pointerId) return;
  const dx = e.clientX - fabDrag.startX;
  const dy = e.clientY - fabDrag.startY;
  if (!fabDrag.moved && Math.hypot(dx, dy) < FAB_DRAG_THRESHOLD) return;
  fabDrag.moved = true;
  composeFab.classList.add('dragging');
  const { maxX, maxY } = fabGeometry();
  let left = e.clientX - fabDrag.offsetX - fabDrag.pbLeft;
  let top = e.clientY - fabDrag.offsetY - fabDrag.pbTop;
  left = Math.min(Math.max(0, left), maxX);
  top = Math.min(Math.max(0, top), maxY);
  composeFab.style.left = `${left}px`;
  composeFab.style.top = `${top}px`;
  fabPos = { rx: maxX ? left / maxX : 0, ry: maxY ? top / maxY : 0 };
});

function endFabDrag(e) {
  if (!fabDrag || (e && e.pointerId !== fabDrag.pointerId)) return;
  const { moved, pointerId } = fabDrag;
  fabDrag = null;
  composeFab.classList.remove('dragging');
  hideFabShield();
  try { composeFab.releasePointerCapture(pointerId); } catch {}
  if (moved) {
    fabSuppressClick = true;
    setTimeout(() => { fabSuppressClick = false; }, 0);
    store.set(FAB_POS_KEY, fabPos);
  }
}

window.addEventListener('pointerup', endFabDrag);
window.addEventListener('pointercancel', endFabDrag);

composeFab.addEventListener('click', () => {
  if (fabSuppressClick) return;
  openComposeModal();
});

async function initComposeFab() {
  const saved = await store.get(FAB_POS_KEY);
  if (saved && typeof saved.rx === 'number' && typeof saved.ry === 'number') {
    fabPos = { rx: saved.rx, ry: saved.ry };
  }
  applyFabPos();
}

window.addEventListener('resize', applyFabPos);

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
  await initComposeFab();
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

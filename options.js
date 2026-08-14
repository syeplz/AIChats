const TEMPLATES = [
  { name: 'ChatGPT',      url: 'https://chatgpt.com',            icon: '' },
  { name: 'DeepSeek',     url: 'https://chat.deepseek.com',       icon: '' },
  { name: 'Claude',       url: 'https://claude.ai',               icon: '' },
  { name: 'Kimi',         url: 'https://kimi.moonshot.cn',        icon: '' },
  { name: '豆包',          url: 'https://www.doubao.com/chat',     icon: '' },
  { name: 'Gemini',       url: 'https://gemini.google.com',       icon: '' },
  { name: 'Perplexity',   url: 'https://www.perplexity.ai',       icon: '' },
  { name: 'Grok',         url: 'https://grok.com',                icon: '' },
  { name: '通义千问',      url: 'https://www.qianwen.com/',          icon: '' },
  { name: '文心一言',      url: 'https://yiyan.baidu.com',         icon: '' },
];

let editingId = null;

async function loadTemplateCache() {
  return await store.get('templateCache') || {};
}

async function saveTemplateIcon(url, icon) {
  const cache = await loadTemplateCache();
  cache[url] = icon;
  await store.set('templateCache', cache);
}

async function fetchTemplateIconWithTimeout(url, timeoutMs = 5000) {
  return Promise.race([
    autoDetectFavicon(url),
    new Promise(resolve => setTimeout(() => resolve(''), timeoutMs))
  ]);
}

async function loadData() {
  const [chats, sidebarChat, theme, prompts] = await Promise.all([
    store.get('chats'),
    store.get('sidebarChat'),
    store.get('theme'),
    store.get('prompts'),
  ]);
  return { chats, sidebarChat, theme, prompts };
}

async function render() {
  const data = await loadData();
  const chats = data.chats || [];
  const sidebarChat = data.sidebarChat || (chats.find(c => c.enabled)?.id || '');
  const theme = data.theme || 'system';
  const prompts = data.prompts || [];

  renderChatList(chats);
  renderTemplates(chats);
  renderSidebarSelect(chats, sidebarChat);
  renderTheme(theme);
  renderPrompts(prompts);
}

async function saveChats(chats) {
  await store.set('chats', chats);
  const sidebarChat = await store.get('sidebarChat') || (chats.find(c => c.enabled)?.id || '');
  renderChatList(chats);
  renderSidebarSelect(chats, sidebarChat);
  renderTemplates(chats);
  chrome.runtime.sendMessage({ action: 'updateContentScripts' });
}

function renderChatList(chats) {
  const list = document.getElementById('chatList');
  list.innerHTML = '';

  if (chats.length === 0) {
    list.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">${_('options_chatListEmpty')}</p>`;
    return;
  }

  chats.forEach((chat, i) => {
    const item = document.createElement('div');
    item.className = `chat-item${chat.enabled ? ' enabled' : ''}`;

    const firstChar = chat.name.charAt(0);

    item.innerHTML = `
      <button class="btn-move" data-id="${chat.id}" data-dir="up" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button class="btn-move" data-id="${chat.id}" data-dir="down" ${i === chats.length - 1 ? 'disabled' : ''}>↓</button>
      <label class="chat-toggle">
        <input type="checkbox" ${chat.enabled ? 'checked' : ''} data-id="${chat.id}">
        <span class="slider"></span>
      </label>
      ${chat.icon
        ? `<img class="chat-icon" src="${chat.icon}" alt="" loading="lazy">`
        : `<span class="ai-badge">AI</span>`}
      <div class="chat-info">
        <div class="chat-name">${chat.name}</div>
        <div class="chat-url">${chat.url}</div>
        <div class="chat-status">
          <span class="status-toggle${chat.inject ? ' status-on' : ' status-off'}" data-id="${chat.id}" data-field="inject" data-tip="${_('options_chatInjectHint')}">
            ${chat.inject ? '✓' : '✕'} ${_('options_chatInjectLabel')}
          </span>
          <span class="status-toggle${chat.submitByEnter ? ' status-on' : ' status-off'}" data-id="${chat.id}" data-field="submitByEnter" data-tip="${_('options_chatEnterHint')}">
            ${chat.submitByEnter ? '✓' : '✕'} ${_('options_chatEnterLabel')}
          </span>
        </div>
      </div>
      <div class="chat-actions">
        <button class="btn-edit" data-id="${chat.id}">${_('common_edit')}</button>
        <button class="btn-danger" data-id="${chat.id}">${_('common_delete')}</button>
      </div>
    `;

    list.appendChild(item);

    item.querySelector('.chat-toggle input').addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const checked = e.target.checked;
      const data = await loadData();
      const updated = chatList.setEnabled(data.chats || [], id, checked);
      await saveChats(updated);
      chrome.runtime.sendMessage({ action: 'updateContentScripts' });
    });

    item.querySelector('.btn-danger').addEventListener('click', async (e) => {
      if (!confirm(_('options_confirmDelete', [chat.name]))) return;
      const id = e.target.dataset.id;
      const data = await loadData();
      const updated = chatList.remove(data.chats || [], id);
      await saveChats(updated);
    });

    item.querySelector('.btn-edit').addEventListener('click', () => {
      openEditModal(chat);
    });

    item.querySelectorAll('.btn-move').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const dir = e.currentTarget.dataset.dir;
        const data = await loadData();
        const updated = chatList.move(data.chats || [], id, dir);
        if (updated !== (data.chats || [])) await saveChats(updated);
      });
    });
  });
}

document.getElementById('chatList').addEventListener('click', async (e) => {
  const toggle = e.target.closest('.status-toggle');
  if (!toggle) return;
  const id = toggle.dataset.id;
  const field = toggle.dataset.field;
  const data = await loadData();
  const updated = (data.chats || []).map(c => {
    if (c.id !== id) return c;
    return { ...c, [field]: !c[field] };
  });
  await store.set('chats', updated);
  renderChatList(updated);
  chrome.runtime.sendMessage({ action: 'updateContentScripts' });
});

const tipEl = document.createElement('div');
tipEl.className = 'tip';
document.body.appendChild(tipEl);

let tipTimer = null;
document.addEventListener('mouseover', (e) => {
  const toggle = e.target.closest('.status-toggle[data-tip]');
  if (!toggle) { tipEl.hidden = true; clearTimeout(tipTimer); return; }
  tipEl.textContent = toggle.dataset.tip;
  tipEl.hidden = false;
  const r = toggle.getBoundingClientRect();
  tipEl.style.left = r.left + 'px';
  tipEl.style.top = r.bottom + 6 + 'px';
});
document.addEventListener('mouseout', (e) => {
  if (e.target.closest('.status-toggle[data-tip]')) {
    tipEl.hidden = true;
  }
});

function openEditModal(chat) {
  editingId = chat.id;
  document.getElementById('editName').value = chat.name;
  document.getElementById('editUrl').value = chat.url;
  document.getElementById('editIcon').value = chat.icon;
  document.getElementById('editModal').hidden = false;
  document.getElementById('editName').focus();
}

function closeEditModal() {
  editingId = null;
  document.getElementById('editModal').hidden = true;
}

document.getElementById('editSave').addEventListener('click', async () => {
  if (!editingId) return;
  const name = document.getElementById('editName').value.trim();
  const url = document.getElementById('editUrl').value.trim();
  let icon = document.getElementById('editIcon').value.trim();
  if (!name || !url) return;
  const data = await loadData();
  const current = (data.chats || []).find(c => c.id === editingId);
  if (current && current.url !== url && !await requestHostPermission(url)) return;
  if (!icon) icon = await autoDetectFavicon(url) || `https://${new URL(url).hostname}/favicon.ico`;
  try {
    const updated = chatList.edit(data.chats || [], editingId, { name, url, icon });
    await saveChats(updated);
    closeEditModal();
  } catch (e) {
    alert(e.message);
  }
});

document.getElementById('editCancel').addEventListener('click', closeEditModal);

document.getElementById('editModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeEditModal();
});

document.getElementById('editModal').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeEditModal();
});

async function renderTemplates(chats) {
  const container = document.getElementById('templates');
  container.innerHTML = '';

  const cache = await loadTemplateCache();

  TEMPLATES.forEach(tpl => {
    const btn = document.createElement('button');
    btn.className = 'template-btn';

    const cachedIcon = cache[tpl.url];
    btn.innerHTML = `${cachedIcon
      ? `<img src="${cachedIcon}" alt="" loading="lazy">`
      : '<span class="ai-badge">AI</span>'} ${tpl.name}`;

    if (!cachedIcon) {
      fetchTemplateIconWithTimeout(tpl.url).then(icon => {
        if (icon) {
          btn.innerHTML = `<img src="${icon}" alt="" loading="lazy"> ${tpl.name}`;
          saveTemplateIcon(tpl.url, icon);
        }
      });
    }

    btn.addEventListener('click', async () => {
      try {
        if (!await requestHostPermission(tpl.url)) return;
        const detected = await autoDetectFavicon(tpl.url);
        const icon = detected || '';
        const data = await loadData();
        const updated = chatList.add(data.chats || [], { name: tpl.name, url: tpl.url, icon });
        await saveChats(updated);
      } catch (e) {
        alert(e.message);
      }
    });
    container.appendChild(btn);
  });
}

function renderSidebarSelect(chats, selected) {
  const select = document.getElementById('sidebarChat');
  const enabled = chats.filter(c => c.enabled);
  select.innerHTML = '';

  if (enabled.length === 0) {
    select.innerHTML = `<option value="">${_('options_noEnabledSites')}</option>`;
    return;
  }

  enabled.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    if (c.id === selected) opt.selected = true;
    select.appendChild(opt);
  });
}

function renderTheme(val) {
  const select = document.getElementById('themeSelect');
  if (select) select.value = val;
}

let promptEditingId = null;

function renderPrompts(prompts) {
  const list = document.getElementById('promptList');
  list.innerHTML = '';

  if (prompts.length === 0) {
    list.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">${_('options_promptsEmpty')}</p>`;
    return;
  }

  prompts.forEach((p, i) => {
    const resolved = localizePrompt(p);
    if (!resolved) return;
    const item = document.createElement('div');
    item.className = 'prompt-item';

    item.innerHTML = `
      <button class="btn-move" data-pid="${p.id}" data-dir="up" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button class="btn-move" data-pid="${p.id}" data-dir="down" ${i === prompts.length - 1 ? 'disabled' : ''}>↓</button>
      <label class="chat-toggle">
        <input type="checkbox" ${p.enabled !== false ? 'checked' : ''} data-pid="${p.id}">
        <span class="slider"></span>
      </label>
      <div class="prompt-info">
        <div class="prompt-label">${escapeHtml(resolved.label)}</div>
        <div class="prompt-preview">${escapeHtml(resolved.content)}</div>
        <div class="prompt-status">
          <span class="status-toggle${p.fillInput !== false ? ' status-on' : ' status-off'}" data-pid="${p.id}" data-field="fillInput" data-tip="${_('options_promptFillInputHint')}">
            ${p.fillInput !== false ? '✓' : '✕'} ${_('options_promptFillInput')}
          </span>
          <span class="status-toggle${p.autoSubmit !== false ? ' status-on' : ' status-off'}" data-pid="${p.id}" data-field="autoSubmit" data-tip="${_('options_promptAutoSubmitHint')}">
            ${p.autoSubmit !== false ? '✓' : '✕'} ${_('options_promptAutoSubmit')}
          </span>
        </div>
      </div>
      <div class="prompt-actions">
        <button class="btn-edit" data-pid="${p.id}">${_('common_edit')}</button>
        <button class="btn-danger" data-pid="${p.id}">${_('common_delete')}</button>
      </div>
    `;

    item.querySelector('.btn-danger').addEventListener('click', async (e) => {
      if (!confirm(_('options_promptsConfirmDelete', [resolved.label]))) return;
      const id = e.target.dataset.pid;
      const data = await loadData();
      const updated = (data.prompts || []).filter(x => x.id !== id);
      await store.set('prompts', updated);
      renderPrompts(updated);
    });

    item.querySelector('.chat-toggle input').addEventListener('change', async (e) => {
      const id = e.target.dataset.pid;
      const checked = e.target.checked;
      const data = await loadData();
      const updated = (data.prompts || []).map(x => x.id === id ? { ...x, enabled: checked } : x);
      await store.set('prompts', updated);
      renderPrompts(updated);
    });

    item.querySelector('.btn-edit').addEventListener('click', () => {
      openPromptEditModal(p);
    });

    item.querySelectorAll('.btn-move').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.pid;
        const dir = e.currentTarget.dataset.dir;
        const data = await loadData();
        const updated = [...(data.prompts || [])];
        const idx = updated.findIndex(x => x.id === id);
        if (idx === -1) return;
        const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= updated.length) return;
        [updated[idx], updated[targetIdx]] = [updated[targetIdx], updated[idx]];
        await store.set('prompts', updated);
        renderPrompts(updated);
      });
    });

    list.appendChild(item);
  });
}

document.getElementById('promptList').addEventListener('click', async (e) => {
  const toggle = e.target.closest('.status-toggle');
  if (!toggle) return;
  const id = toggle.dataset.pid;
  const field = toggle.dataset.field;
  const data = await loadData();
  const updated = (data.prompts || []).map(p => {
    if (p.id !== id) return p;
    return { ...p, [field]: p[field] === false };
  });
  await store.set('prompts', updated);
  renderPrompts(updated);
});

function openPromptEditModal(p) {
  const resolved = localizePrompt(p) || p;
  promptEditingId = p.id;
  document.getElementById('promptEditLabel').value = resolved.label;
  document.getElementById('promptEditContent').value = resolved.content;
  document.getElementById('promptEditFillInput').checked = p.fillInput !== false;
  document.getElementById('promptEditAutoSubmit').checked = p.autoSubmit !== false;
  document.getElementById('promptEditModal').hidden = false;
  document.getElementById('promptEditLabel').focus();
}

function closePromptEditModal() {
  promptEditingId = null;
  document.getElementById('promptEditModal').hidden = true;
}

document.getElementById('promptEditSave').addEventListener('click', async () => {
  if (!promptEditingId) return;
  const label = document.getElementById('promptEditLabel').value.trim();
  const content = document.getElementById('promptEditContent').value.trim();
  if (!label || !content) return;
  const fillInput = document.getElementById('promptEditFillInput').checked;
  const autoSubmit = document.getElementById('promptEditAutoSubmit').checked;
  const data = await loadData();
  const updated = (data.prompts || []).map(p =>
    p.id === promptEditingId ? { ...p, label, content, isDefault: false, fillInput, autoSubmit } : p
  );
  await store.set('prompts', updated);
  closePromptEditModal();
  renderPrompts(updated);
});

document.getElementById('promptEditCancel').addEventListener('click', closePromptEditModal);
document.getElementById('promptEditModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closePromptEditModal();
});
document.getElementById('promptEditModal').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePromptEditModal();
});

document.getElementById('promptAddBtn').addEventListener('click', async () => {
  const label = document.getElementById('promptAddLabel').value.trim();
  const content = document.getElementById('promptAddContent').value.trim();
  if (!label || !content) return;
  const data = await loadData();
  const prompts = data.prompts || [];
  const id = 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  prompts.push({ id, label, content, enabled: true, fillInput: true, autoSubmit: true });
  await store.set('prompts', prompts);
  document.getElementById('promptAddLabel').value = '';
  document.getElementById('promptAddContent').value = '';
  renderPrompts(prompts);
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.querySelectorAll('.btn-detect').forEach(btn => {
  btn.addEventListener('click', async () => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    const urlInput = targetId === 'addIcon' ? document.getElementById('addUrl') : document.getElementById('editUrl');
    const siteUrl = urlInput.value.trim();
    if (!siteUrl) { input.value = ''; return; }
    if (!await requestHostPermission(siteUrl)) return;
    btn.disabled = true;
    btn.textContent = _('common_detecting');
    const iconUrl = await autoDetectFavicon(siteUrl);
    if (iconUrl) {
      input.value = iconUrl;
    } else {
      input.value = `https://${new URL(siteUrl).hostname}/favicon.ico`;
    }
    btn.disabled = false;
    btn.textContent = _('common_detect');
  });
});

document.getElementById('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('addName').value.trim();
  const url = document.getElementById('addUrl').value.trim();
  if (!name || !url) return;
  if (!await requestHostPermission(url)) return;
  let icon = document.getElementById('addIcon').value.trim();
  if (!icon) icon = await autoDetectFavicon(url) || `https://${new URL(url).hostname}/favicon.ico`;
  const data = await loadData();
  try {
    const updated = chatList.add(data.chats || [], { name, url, icon });
    await saveChats(updated);
    document.getElementById('addName').value = '';
    document.getElementById('addUrl').value = '';
    document.getElementById('addIcon').value = '';
  } catch (e) {
    alert(e.message);
  }
});

document.getElementById('btnSave').addEventListener('click', async () => {
  const sidebarChat = document.getElementById('sidebarChat').value;
  const theme = document.getElementById('themeSelect').value;

  const data = await loadData();
  const enabled = (data.chats || []).filter(c => c.enabled);
  const finalSidebar = sidebarChat || (enabled[0]?.id) || '';

  await store.set('sidebarChat', finalSidebar);
  await store.set('theme', theme);
  applyTheme(theme);

  const status = document.getElementById('saveStatus');
  status.textContent = _('options_saved');
  status.className = 'save-status';
  setTimeout(() => { status.textContent = ''; }, 2000);
});

async function requestHostPermission(url) {
  try {
    const u = new URL(url);
    const pattern = u.origin + '/*';
    const has = await chrome.permissions.contains({ origins: [pattern] });
    if (has) return true;
    const granted = await chrome.permissions.request({ origins: [pattern] });
    if (!granted) alert(_('permission_required'));
    return granted;
  } catch (e) {
    console.error('requestHostPermission error:', e);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await initI18n();
  translatePage();
  await initTheme();
  render();
});

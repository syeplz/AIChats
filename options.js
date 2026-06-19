const TEMPLATES = [
  { name: 'ChatGPT',      url: 'https://chat.openai.com',        icon: 'https://chat.openai.com/favicon.ico' },
  { name: 'DeepSeek',     url: 'https://chat.deepseek.com',       icon: 'https://chat.deepseek.com/favicon.ico' },
  { name: 'Claude',       url: 'https://claude.ai',               icon: 'https://claude.ai/favicon.ico' },
  { name: 'Kimi',         url: 'https://kimi.moonshot.cn',        icon: 'https://kimi.moonshot.cn/favicon.ico' },
  { name: '豆包',          url: 'https://www.doubao.com/chat',     icon: 'https://www.doubao.com/favicon.ico' },
  { name: 'Gemini',       url: 'https://gemini.google.com',       icon: 'https://gemini.google.com/favicon.ico' },
  { name: 'Perplexity',   url: 'https://www.perplexity.ai',       icon: 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32' },
  { name: 'Grok',         url: 'https://grok.com',                icon: 'https://www.google.com/s2/favicons?domain=grok.com&sz=32' },
  { name: '通义千问',      url: 'https://www.qianwen.com/',          icon: 'https://www.qianwen.com/favicon.ico' },
  { name: '文心一言',      url: 'https://yiyan.baidu.com',         icon: 'https://yiyan.baidu.com/favicon.ico' },
];

let editingId = null;

async function loadData() {
  const [chats, columns, sidebarChat, theme, prompts] = await Promise.all([
    store.get('chats'),
    store.get('columns'),
    store.get('sidebarChat'),
    store.get('theme'),
    store.get('prompts'),
  ]);
  return { chats, columns, sidebarChat, theme, prompts };
}

async function render() {
  const data = await loadData();
  const chats = data.chats || [];
  const columns = data.columns || 2;
  const sidebarChat = data.sidebarChat || (chats.find(c => c.enabled)?.id || '');
  const theme = data.theme || 'system';
  const prompts = data.prompts || [];

  renderChatList(chats);
  renderTemplates(chats);
  renderSidebarSelect(chats, sidebarChat);
  renderColumns(columns);
  renderTheme(theme);
  renderPrompts(prompts);
}

async function saveChats(chats) {
  await store.set('chats', chats);
  render();
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
      <img class="chat-icon" src="${chat.icon}" alt="" loading="lazy">
      <div class="chat-info">
        <div class="chat-name">${chat.name}</div>
        <div class="chat-url">${chat.url}</div>
      </div>
      <div class="chat-actions">
        <button class="btn-edit" data-id="${chat.id}">${_('common_edit')}</button>
        <button class="btn-danger" data-id="${chat.id}">${_('common_delete')}</button>
      </div>
    `;

    list.appendChild(item);

    const iconImg = item.querySelector('.chat-icon');
    iconImg.addEventListener('error', () => {
      if (iconImg.dataset.resolved) return;
      iconImg.dataset.resolved = '1';
      upgradeIcon(iconImg, chat);
    });

    item.querySelector('.chat-toggle input').addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const checked = e.target.checked;
      const data = await loadData();
      const updated = chatList.setEnabled(data.chats || [], id, checked);
      await saveChats(updated);
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
  if (!icon) icon = await autoDetectFavicon(url) || `https://${new URL(url).hostname}/favicon.ico`;
  const data = await loadData();
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

function renderTemplates(chats) {
  const container = document.getElementById('templates');
  container.innerHTML = '';

  TEMPLATES.forEach(tpl => {
    const btn = document.createElement('button');
    btn.className = 'template-btn';
    btn.innerHTML = `<img src="${tpl.icon}" alt="" loading="lazy"> ${tpl.name}`;
    btn.addEventListener('click', async () => {
      const data = await loadData();
      try {
        const detected = await autoDetectFavicon(tpl.url);
        const icon = detected || tpl.icon;
        const updated = chatList.add(data.chats || [], { name: tpl.name, url: tpl.url, icon });
        await saveChats(updated);
      } catch (e) {
        alert(e.message);
      }
    });
    container.appendChild(btn);
  });

  TEMPLATES.forEach((tpl, i) => {
    autoDetectFavicon(tpl.url).then(detected => {
      if (detected && detected !== tpl.icon) {
        const imgs = container.querySelectorAll('img');
        if (imgs[i]) setFaviconSrc(imgs[i], detected, tpl.url);
      }
    });
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

function renderColumns(val) {
  const slider = document.getElementById('columns');
  const display = document.getElementById('columnsValue');
  slider.value = val;
  display.textContent = val;
  slider.addEventListener('input', () => {
    display.textContent = slider.value;
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
    const item = document.createElement('div');
    item.className = 'prompt-item';

    item.innerHTML = `
      <button class="btn-move" data-pid="${p.id}" data-dir="up" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button class="btn-move" data-pid="${p.id}" data-dir="down" ${i === prompts.length - 1 ? 'disabled' : ''}>↓</button>
      <div class="prompt-info">
        <div class="prompt-label">${escapeHtml(resolved.label)}</div>
        <div class="prompt-preview">${escapeHtml(resolved.content)}</div>
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
      const prompts = (data.prompts || []).filter(x => x.id !== id);
      await store.set('prompts', prompts);
      render();
    });

    item.querySelector('.btn-edit').addEventListener('click', () => {
      openPromptEditModal(p);
    });

    item.querySelectorAll('.btn-move').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.pid;
        const dir = e.currentTarget.dataset.dir;
        const data = await loadData();
        const prompts = [...(data.prompts || [])];
        const idx = prompts.findIndex(x => x.id === id);
        if (idx === -1) return;
        const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= prompts.length) return;
        [prompts[idx], prompts[targetIdx]] = [prompts[targetIdx], prompts[idx]];
        await store.set('prompts', prompts);
        render();
      });
    });

    list.appendChild(item);
  });
}

function openPromptEditModal(p) {
  const resolved = localizePrompt(p);
  promptEditingId = p.id;
  document.getElementById('promptEditLabel').value = resolved.label;
  document.getElementById('promptEditContent').value = resolved.content;
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
  const data = await loadData();
  const prompts = (data.prompts || []).map(p =>
    p.id === promptEditingId ? { ...p, label, content, isDefault: false } : p
  );
  await store.set('prompts', prompts);
  closePromptEditModal();
  render();
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
  prompts.push({ id, label, content });
  await store.set('prompts', prompts);
  document.getElementById('promptAddLabel').value = '';
  document.getElementById('promptAddContent').value = '';
  render();
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
  let icon = document.getElementById('addIcon').value.trim();
  if (!icon) icon = await autoDetectFavicon(url) || `https://${new URL(url).hostname}/favicon.ico`;
  if (!name || !url) return;
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
  const columns = parseInt(document.getElementById('columns').value) || 2;
  const sidebarChat = document.getElementById('sidebarChat').value;
  const theme = document.getElementById('themeSelect').value;

  const data = await loadData();
  const enabled = (data.chats || []).filter(c => c.enabled);
  const finalSidebar = sidebarChat || (enabled[0]?.id) || '';

  await store.set('columns', columns);
  await store.set('sidebarChat', finalSidebar);
  await store.set('theme', theme);
  applyTheme(theme);

  const status = document.getElementById('saveStatus');
  status.textContent = _('options_saved');
  status.className = 'save-status';
  setTimeout(() => { status.textContent = ''; }, 2000);
});

document.addEventListener('DOMContentLoaded', async () => {
  await initI18n();
  translatePage();
  await initTheme();
  render();
});

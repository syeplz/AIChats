const TEMPLATES = [
  { name: 'ChatGPT',      url: 'https://chat.openai.com',        icon: 'https://chat.openai.com/favicon.ico' },
  { name: 'DeepSeek',     url: 'https://chat.deepseek.com',       icon: 'https://chat.deepseek.com/favicon.ico' },
  { name: 'Claude',       url: 'https://claude.ai',               icon: 'https://claude.ai/favicon.ico' },
  { name: 'Kimi',         url: 'https://kimi.moonshot.cn',        icon: 'https://kimi.moonshot.cn/favicon.ico' },
  { name: '豆包',          url: 'https://www.doubao.com/chat',     icon: 'https://www.doubao.com/favicon.ico' },
  { name: 'Gemini',       url: 'https://gemini.google.com',       icon: 'https://gemini.google.com/favicon.ico' },
  { name: 'Perplexity',   url: 'https://www.perplexity.ai',       icon: 'https://www.perplexity.ai/favicon.ico' },
  { name: 'Grok',         url: 'https://grok.com',                icon: 'https://www.google.com/s2/favicons?domain=grok.com&sz=32' },
  { name: '通义千问',      url: 'https://tongyi.aliyun.com',       icon: 'https://tongyi.aliyun.com/favicon.ico' },
  { name: '文心一言',      url: 'https://yiyan.baidu.com',         icon: 'https://yiyan.baidu.com/favicon.ico' },
];

let editingId = null;

function generateId() {
  return 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

async function loadData() {
  return chrome.storage.sync.get(['chats', 'columns', 'sidebarChat', 'theme']);
}

async function render() {
  const data = await loadData();
  const chats = data.chats || [];
  const columns = data.columns || 2;
  const sidebarChat = data.sidebarChat || (chats.find(c => c.enabled)?.id || '');
  const theme = data.theme || 'system';

  renderChatList(chats);
  renderTemplates(chats);
  renderSidebarSelect(chats, sidebarChat);
  renderColumns(columns);
  renderTheme(theme);
}

async function saveChats(chats) {
  await chrome.storage.sync.set({ chats });
  render();
}

function renderChatList(chats) {
  const list = document.getElementById('chatList');
  list.innerHTML = '';

  if (chats.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">还没有聊天站点，从上方模板添加或手动添加。</p>';
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
      <img class="chat-icon" src="${chat.icon}" alt="" onerror="this.alt='${firstChar}'" loading="lazy">
      <div class="chat-info">
        <div class="chat-name">${chat.name}</div>
        <div class="chat-url">${chat.url}</div>
      </div>
      <div class="chat-actions">
        <button class="btn-edit" data-id="${chat.id}">编辑</button>
        <button class="btn-danger" data-id="${chat.id}">删除</button>
      </div>
    `;

    list.appendChild(item);

    item.querySelector('.chat-toggle input').addEventListener('change', async (e) => {
      const data = await loadData();
      const list = data.chats || [];
      const target = list.find(c => c.id === e.target.dataset.id);
      if (target) target.enabled = e.target.checked;
      await saveChats(list);
    });

    item.querySelector('.btn-danger').addEventListener('click', async (e) => {
      if (!confirm(`确定删除 "${chat.name}"？`)) return;
      const data = await loadData();
      const list = data.chats || [];
      const filtered = list.filter(c => c.id !== e.target.dataset.id);
      await saveChats(filtered);
    });

    item.querySelector('.btn-edit').addEventListener('click', () => {
      openEditModal(chat);
    });

    item.querySelectorAll('.btn-move').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const dir = e.currentTarget.dataset.dir;
        const data = await loadData();
        const list = data.chats || [];
        const idx = list.findIndex(c => c.id === id);
        if (idx === -1) return;
        const swap = dir === 'up' ? idx - 1 : idx + 1;
        if (swap < 0 || swap >= list.length) return;
        [list[idx], list[swap]] = [list[swap], list[idx]];
        await saveChats(list);
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
  const list = data.chats || [];
  const target = list.find(c => c.id === editingId);
  if (target) {
    target.name = name;
    target.url = url;
    target.icon = icon;
  }
  await saveChats(list);
  closeEditModal();
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
      const list = data.chats || [];
      if (list.some(c => c.url === tpl.url)) {
        alert(`"${tpl.name}" 已在列表中`);
        return;
      }
      list.push({
        id: generateId(),
        name: tpl.name,
        url: tpl.url,
        icon: tpl.icon,
        enabled: true,
      });
      await saveChats(list);
      const detected = await autoDetectFavicon(tpl.url);
      if (detected && detected !== tpl.icon) {
        const data2 = await loadData();
        const list2 = data2.chats || [];
        const target = list2.find(c => c.url === tpl.url);
        if (target) {
          target.icon = detected;
          await chrome.storage.sync.set({ chats: list2 });
        }
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

async function setFaviconSrc(img, iconUrl, siteUrl) {
  try {
    const origin = new URL(siteUrl).origin;
    const resp = await fetch(iconUrl, { headers: { 'Referer': origin + '/' } });
    if (!resp.ok) throw new Error();
    const blob = await resp.blob();
    img.src = URL.createObjectURL(blob);
  } catch {
    img.src = `https://www.google.com/s2/favicons?domain=${new URL(siteUrl).hostname}&sz=32`;
  }
}

function renderSidebarSelect(chats, selected) {
  const select = document.getElementById('sidebarChat');
  const enabled = chats.filter(c => c.enabled);
  select.innerHTML = '';

  if (enabled.length === 0) {
    select.innerHTML = '<option value="">— 无已启用站点 —</option>';
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

async function autoDetectFavicon(siteUrl) {
  let url;
  try { url = new URL(siteUrl); } catch { return ''; }
  const origin = url.origin;

  const htmlCandidates = [];
  try {
    const resp = await fetch(origin, { signal: AbortSignal.timeout(4000) });
    if (resp.ok) {
      const html = await resp.text();
      const patterns = [
        /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/ig,
        /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/ig,
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/ig,
      ];
      for (const pat of patterns) {
        let m;
        while ((m = pat.exec(html)) !== null) {
          const href = m[1];
          htmlCandidates.push(href.startsWith('http') ? href : new URL(href, origin).href);
        }
      }
    }
  } catch {}

  const reqInit = { signal: AbortSignal.timeout(2000), headers: { 'Referer': origin + '/' } };
  for (const c of htmlCandidates) {
    try {
      const r = await fetch(c, reqInit);
      if (r.ok) {
        const ct = r.headers.get('Content-Type') || '';
        if (!ct.startsWith('text/')) { r.body?.cancel(); return c; }
        r.body?.cancel();
      }
    } catch {}
  }

  const fallbacks = [`${origin}/favicon.ico`, `${origin}/favicon.svg`, `${origin}/favicon-32x32.png`];
  for (const c of fallbacks) {
    try {
      const r = await fetch(c, reqInit);
      if (r.ok) {
        const ct = r.headers.get('Content-Type') || '';
        if (!ct.startsWith('text/')) { r.body?.cancel(); return c; }
        r.body?.cancel();
      }
    } catch {}
  }
  return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
}

document.querySelectorAll('.btn-detect').forEach(btn => {
  btn.addEventListener('click', async () => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    const urlInput = targetId === 'addIcon' ? document.getElementById('addUrl') : document.getElementById('editUrl');
    const siteUrl = urlInput.value.trim();
    if (!siteUrl) { input.value = ''; return; }
    btn.disabled = true;
    btn.textContent = '检测中…';
    const iconUrl = await autoDetectFavicon(siteUrl);
    if (iconUrl) {
      input.value = iconUrl;
    } else {
      input.value = `https://${new URL(siteUrl).hostname}/favicon.ico`;
    }
    btn.disabled = false;
    btn.textContent = '检测';
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
  const list = data.chats || [];

  if (list.some(c => c.url === url)) {
    alert('该 URL 已在列表中');
    return;
  }

  list.push({ id: generateId(), name, url, icon, enabled: true });
  await saveChats(list);

  document.getElementById('addName').value = '';
  document.getElementById('addUrl').value = '';
  document.getElementById('addIcon').value = '';
});

document.getElementById('btnSave').addEventListener('click', async () => {
  const columns = parseInt(document.getElementById('columns').value) || 2;
  const sidebarChat = document.getElementById('sidebarChat').value;
  const theme = document.getElementById('themeSelect').value;

  const data = await loadData();
  const enabled = (data.chats || []).filter(c => c.enabled);
  const finalSidebar = sidebarChat || (enabled[0]?.id) || '';

  await chrome.storage.sync.set({ columns, sidebarChat: finalSidebar, theme });
  applyTheme(theme);

  const status = document.getElementById('saveStatus');
  status.textContent = '✓ 已保存';
  status.className = 'save-status';
  setTimeout(() => { status.textContent = ''; }, 2000);
});

document.addEventListener('DOMContentLoaded', async () => {
  await initTheme();
  render();
});

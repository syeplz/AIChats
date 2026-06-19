const DEFAULT_CHATS = [
  { id: 'chatgpt',  name: 'ChatGPT',  url: 'https://chatgpt.com',            icon: 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=32',        enabled: true },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com',       icon: 'https://www.google.com/s2/favicons?domain=chat.deepseek.com&sz=32',   enabled: true },
  { id: 'claude',   name: 'Claude',   url: 'https://claude.ai',               icon: 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32',           enabled: true },
  { id: 'kimi',     name: 'Kimi',     url: 'https://kimi.moonshot.cn',        icon: 'https://www.google.com/s2/favicons?domain=kimi.moonshot.cn&sz=32',    enabled: false },
  { id: 'doubao',   name: '豆包',      url: 'https://www.doubao.com/chat',     icon: 'https://www.google.com/s2/favicons?domain=doubao.com&sz=32',      enabled: false },
];

const MIN_CELL_WIDTH = 380;

let chats = [];
let columns = 2;
let currentCols = 0;

const gallery = document.getElementById('gallery');
const grid = document.getElementById('grid');
const screenDots = document.getElementById('screenDots');
const cellCache = new Map();

async function loadConfig() {
  const saved = await store.get('chats');
  chats = (saved || DEFAULT_CHATS).filter(c => c.enabled);
  columns = await store.get('columns') || 2;
}

function getEffectiveColumns() {
  const vw = window.innerWidth;
  const maxCols = Math.max(1, Math.floor((vw - 4) / MIN_CELL_WIDTH));
  return Math.min(columns, maxCols);
}

function createCellElement(chat) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  const firstChar = chat.name.charAt(0);
  cell.innerHTML = `
    <div class="cell-header">
      <div class="cell-name">
        <img src="${chat.icon}" alt="" loading="lazy" data-icon="${chat.icon}">
        <span class="fallback-icon" style="display:none">${firstChar}</span>
        ${chat.name}
      </div>
      <div class="cell-actions">
        <button class="btn-refresh" title="${_('common_refresh')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 2 22 8 16 8"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L22 8"/><circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none"/></svg></button>
        <button title="${_('common_openInNewTab')}" data-url="${chat.url}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></button>
      </div>
    </div>
    <div class="cell-content">
      <iframe src="${chat.url}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" loading="lazy"></iframe>
      <div class="cell-overlay" hidden>
        <p>${_('standalone_errorOverlay')}</p>
        <button data-url="${chat.url}">${_('common_openInNewTab')}</button>
      </div>
    </div>
  `;
  bindImgError(cell);
  cell.dataset.chatId = chat.id;
  return cell;
}

function ensureCells() {
  chats.forEach(chat => {
    if (cellCache.has(chat.id)) {
      const cell = cellCache.get(chat.id);
      const img = cell.querySelector('.cell-name img');
      if (img && img.dataset.icon !== chat.icon) {
        img.dataset.icon = chat.icon;
        img.dataset.resolved = '';
        img.src = chat.icon;
        img.style.display = '';
        const fallback = img.nextElementSibling;
        if (fallback?.classList.contains('fallback-icon')) {
          fallback.style.display = 'none';
        }
      }
      return;
    }
    const cell = createCellElement(chat);
    cellCache.set(chat.id, cell);
  });
  for (const [id, el] of cellCache) {
    if (!chats.some(c => c.id === id)) {
      el.remove();
      cellCache.delete(id);
    }
  }
}

function bindImgError(container) {
  container.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => {
      if (img.dataset.resolved) {
        img.style.display = 'none';
        const fallback = img.nextElementSibling;
        if (fallback?.classList.contains('fallback-icon')) {
          fallback.style.display = 'flex';
        }
        return;
      }
      img.dataset.resolved = '1';
      const cell = container.closest('.cell');
      const chatId = cell?.dataset.chatId;
      const chat = chats.find(c => c.id === chatId);
      if (chat) upgradeIcon(img, chat);
    });
  });
}

function render() {
  if (chats.length === 0) {
    grid.innerHTML = `<div class="empty-state"><p>${_('standalone_emptyText')}</p></div>`;
    return;
  }

  ensureCells();

  const cols = getEffectiveColumns();

  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  const frag = document.createDocumentFragment();
  chats.forEach(chat => {
    const cell = cellCache.get(chat.id);
    if (cell) frag.appendChild(cell);
  });
  grid.innerHTML = '';
  grid.appendChild(frag);

  currentCols = cols;

  document.querySelectorAll('.cell-actions button[data-url]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.tabs.create({ url: btn.dataset.url });
    });
  });
  document.querySelectorAll('.cell-actions .btn-refresh').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const iframe = btn.closest('.cell').querySelector('iframe');
      if (iframe) iframe.src = iframe.src;
    });
  });
  document.querySelectorAll('.cell-overlay button[data-url]').forEach(btn => {
    btn.addEventListener('click', () => {
      chrome.tabs.create({ url: btn.dataset.url });
    });
  });

  renderDots();
}

function renderDots() {
  const numScreens = chats.length === 0 ? 0 : Math.ceil(chats.length / currentCols);
  if (numScreens <= 1) {
    screenDots.hidden = true;
    return;
  }
  screenDots.innerHTML = '';
  for (let i = 0; i < numScreens; i++) {
    const btn = document.createElement('button');
    btn.dataset.screen = i;
    btn.setAttribute('aria-label', _('standalone_screenDotLabel', [i + 1]));
    btn.addEventListener('click', () => {
      gallery.scrollTo({ top: i * (window.innerHeight - 4), behavior: 'smooth' });
    });
    screenDots.appendChild(btn);
  }
  screenDots.hidden = false;
  updateActiveDot();
}

function updateActiveDot() {
  const dots = screenDots.querySelectorAll('button');
  if (dots.length === 0) return;
  const numScreens = dots.length;
  const screenIndex = Math.min(
    Math.max(0, Math.round(gallery.scrollTop / (window.innerHeight - 4))),
    numScreens - 1
  );
  dots.forEach((dot, i) => dot.classList.toggle('active', i === screenIndex));
}

let savedScrollTop = 0;
let scrollTicking = false;
function onGalleryScroll() {
  if (!scrollTicking) {
    requestAnimationFrame(() => {
      updateActiveDot();
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}

function onResize() {
  const cols = getEffectiveColumns();
  if (cols === currentCols) return;
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  currentCols = cols;
  renderDots();
}

async function init() {
  await initI18n();
  translatePage();
  await loadConfig();
  await initTheme();
  render();
  gallery.scrollTop = 0;

  window.addEventListener('resize', onResize);
  gallery.addEventListener('scroll', onGalleryScroll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      savedScrollTop = gallery.scrollTop;
    } else {
      gallery.scrollTop = savedScrollTop;
    }
  });

  store.subscribe('chats', () => loadConfig().then(render));
  store.subscribe('columns', () => loadConfig().then(render));
}

init();

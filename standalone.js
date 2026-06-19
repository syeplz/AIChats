const DEFAULT_CHATS = [
  { id: 'chatgpt',  name: 'ChatGPT',  url: 'https://chat.openai.com',        icon: 'https://chat.openai.com/favicon.ico',    enabled: true },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com',       icon: 'https://chat.deepseek.com/favicon.ico',   enabled: true },
  { id: 'claude',   name: 'Claude',   url: 'https://claude.ai',               icon: 'https://claude.ai/favicon.ico',           enabled: true },
  { id: 'kimi',     name: 'Kimi',     url: 'https://kimi.moonshot.cn',        icon: 'https://kimi.moonshot.cn/favicon.ico',    enabled: false },
  { id: 'doubao',   name: '豆包',      url: 'https://www.doubao.com/chat',     icon: 'https://www.doubao.com/favicon.ico',      enabled: false },
];

const MIN_CELL_WIDTH = 380;

let chats = [];
let columns = 2;
let currentPage = 0;
let newTabOverride = true;

const track = document.getElementById('track');
const thumbstrip = document.getElementById('thumbstrip');
const arrowLeft = document.getElementById('arrowLeft');
const arrowRight = document.getElementById('arrowRight');
const viewport = document.getElementById('viewport');
const gallery = document.querySelector('.gallery');
const app = document.getElementById('app');
const disabledMsg = document.getElementById('disabledMessage');
const cellCache = new Map();

async function loadConfig() {
  const data = await chrome.storage.sync.get(['chats', 'columns', 'newTabOverride']);
  chats = (data.chats || DEFAULT_CHATS).filter(c => c.enabled);
  columns = data.columns || 2;
  newTabOverride = data.newTabOverride !== false;
}

function getEffectiveColumns() {
  const vw = window.innerWidth;
  const maxCols = Math.max(1, Math.floor((vw - 80) / MIN_CELL_WIDTH));
  return Math.min(columns, maxCols);
}

function totalPages() {
  const cols = getEffectiveColumns();
  return Math.max(1, Math.ceil(chats.length / cols));
}

function createCellElement(chat) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  const firstChar = chat.name.charAt(0);
  cell.innerHTML = `
    <div class="cell-header">
      <div class="cell-name">
        <img src="${chat.icon}" alt="" loading="lazy">
        <span class="fallback-icon" style="display:none">${firstChar}</span>
        ${chat.name}
      </div>
      <div class="cell-actions">
        <button title="在新标签页打开" data-url="${chat.url}">↗</button>
      </div>
    </div>
    <div class="cell-content">
      <iframe src="${chat.url}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" loading="lazy"></iframe>
      <div class="cell-overlay" hidden>
        <p>无法加载，请尝试在新标签页打开</p>
        <button data-url="${chat.url}">在新标签页打开</button>
      </div>
    </div>
  `;
  bindImgError(cell);
  cell.dataset.chatId = chat.id;
  return cell;
}

function ensureCells() {
  chats.forEach(chat => {
    if (!cellCache.has(chat.id)) {
      const cell = createCellElement(chat);
      cellCache.set(chat.id, cell);
    }
  });
  for (const [id, el] of cellCache) {
    if (!chats.some(c => c.id === id)) {
      el.remove();
      cellCache.delete(id);
    }
  }
}

function layoutPages() {
  const cols = getEffectiveColumns();
  const pages = totalPages();
  if (currentPage >= pages) currentPage = pages - 1;
  if (currentPage < 0) currentPage = 0;

  const cells = Array.from(track.querySelectorAll('.cell'));
  const frag = document.createDocumentFragment();
  cells.forEach(c => frag.appendChild(c));

  track.innerHTML = '';
  for (let p = 0; p < pages; p++) {
    const pageEl = document.createElement('div');
    pageEl.className = 'page';
    pageEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    pageEl.style.gridTemplateRows = '1fr';

    const start = p * cols;
    const end = Math.min(start + cols, chats.length);
    for (let i = start; i < end; i++) {
      const chat = chats[i];
      const cell = cellCache.get(chat.id);
      if (cell) pageEl.appendChild(cell);
    }
    track.appendChild(pageEl);
  }

  track.style.transition = 'none';
  track.style.transform = `translateX(-${currentPage * 100}%)`;
}

function render() {
  if (!newTabOverride) {
    app.hidden = true;
    disabledMsg.hidden = false;
    return;
  }

  if (chats.length === 0) {
    app.hidden = false;
    disabledMsg.hidden = true;
    track.innerHTML = `
      <div class="empty-state">
        <p>还没有添加聊天站点，请在扩展图标右键菜单中打开设置</p>
      </div>`;
    thumbstrip.innerHTML = '';
    arrowLeft.classList.add('hidden');
    arrowRight.classList.add('hidden');
    syncGalleryHeight();
    return;
  }

  app.hidden = false;
  disabledMsg.hidden = true;

  ensureCells();

  const cols = getEffectiveColumns();
  const pages = totalPages();
  layoutPages();

  renderThumbnails(cols, pages);
  updateArrows(pages);
  bindCellEvents();
  syncGalleryHeight();
}

function renderThumbnails(cols, pages) {
  thumbstrip.innerHTML = '';
  for (let p = 0; p < pages; p++) {
    const start = p * cols;
    const end = Math.min(start + cols, chats.length);
    for (let i = start; i < end; i++) {
      const chat = chats[i];
      const thumb = document.createElement('div');
      thumb.className = 'thumb' + (p === currentPage ? ' active' : '');
      const firstChar = chat.name.charAt(0);
      thumb.innerHTML = `
        <img src="${chat.icon}" alt="" loading="lazy">
        <span class="fallback-icon" style="display:none">${firstChar}</span>
        ${chat.name}
      `;
      bindImgError(thumb);
      thumb.dataset.page = p;
      thumb.addEventListener('click', () => goToPage(p));
      thumbstrip.appendChild(thumb);
    }
  }

  const active = thumbstrip.querySelector('.thumb.active');
  if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

function bindImgError(container) {
  container.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => {
      img.style.display = 'none';
      const fallback = img.nextElementSibling;
      if (fallback && fallback.classList.contains('fallback-icon')) {
        fallback.style.display = 'flex';
      }
    });
  });
}

function updateArrows(pages) {
  arrowLeft.classList.toggle('hidden', pages <= 1 || currentPage === 0);
  arrowRight.classList.toggle('hidden', pages <= 1 || currentPage >= pages - 1);
}

function bindCellEvents() {
  document.querySelectorAll('.cell-actions button[data-url]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.tabs.create({ url: btn.dataset.url });
    });
  });

  document.querySelectorAll('.cell-overlay button[data-url]').forEach(btn => {
    btn.addEventListener('click', () => {
      chrome.tabs.create({ url: btn.dataset.url });
    });
  });
}

function goToPage(index) {
  const pages = totalPages();
  if (index < 0) index = 0;
  if (index >= pages) index = pages - 1;
  if (index === currentPage) return;
  currentPage = index;
  track.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
  track.style.transform = `translateX(-${currentPage * 100}%)`;
  renderThumbnails(columns, pages);
  updateArrows(pages);
  syncGalleryHeight();
}

function goNext() { goToPage(currentPage + 1); }
function goPrev() { goToPage(currentPage - 1); }

let wheelTimeout = null;
function handleWheel(e) {
  if (e.target.closest('.thumbstrip')) return;
  const delta = e.deltaX || e.deltaY;
  if (Math.abs(delta) < 30) return;
  if (wheelTimeout) return;
  wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 400);
  if (delta > 0) goNext();
  else goPrev();
}

let touchStartX = 0;
let touchStartY = 0;
let touchMoved = false;

function handleTouchStart(e) {
  if (e.target.closest('.thumbstrip')) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchMoved = false;
}

function handleTouchEnd(e) {
  if (!touchMoved) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) {
    if (dx < 0) goNext();
    else goPrev();
  }
}

function handleTouchMove(e) {
  const dx = Math.abs(e.touches[0].clientX - touchStartX);
  const dy = Math.abs(e.touches[0].clientY - touchStartY);
  if (dx > 10 || dy > 10) touchMoved = true;
  if (dx > dy && dx > 10) e.preventDefault();
}

function onResize() {
  syncGalleryHeight();
  if (chats.length === 0) return;
  layoutPages();
  const cols = getEffectiveColumns();
  const pages = totalPages();
  renderThumbnails(cols, pages);
  updateArrows(pages);
}

function syncGalleryHeight() {
  const thumbH = thumbstrip.offsetHeight || 60;
  gallery.style.bottom = thumbH + 'px';
}

async function init() {
  await loadConfig();
  await initTheme();
  syncGalleryHeight();
  render();

  arrowLeft.addEventListener('click', goPrev);
  arrowRight.addEventListener('click', goNext);

  viewport.addEventListener('wheel', handleWheel, { passive: false });
  viewport.addEventListener('touchstart', handleTouchStart, { passive: true });
  viewport.addEventListener('touchmove', handleTouchMove, { passive: false });
  viewport.addEventListener('touchend', handleTouchEnd, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();
  });

  window.addEventListener('resize', onResize);

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.chats || changes.columns || changes.newTabOverride) {
      loadConfig().then(render);
    }
  });
}

init();

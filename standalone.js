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
let currentCols = 0;

const gallery = document.getElementById('gallery');
const grid = document.getElementById('grid');
const screenDots = document.getElementById('screenDots');
const cellCache = new Map();

async function loadConfig() {
  const data = await chrome.storage.sync.get(['chats', 'columns']);
  chats = (data.chats || DEFAULT_CHATS).filter(c => c.enabled);
  columns = data.columns || 2;
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

function render() {
  if (chats.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>还没有添加聊天站点，请在扩展图标右键菜单中打开设置</p>
      </div>`;
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
    btn.setAttribute('aria-label', `第 ${i + 1} 屏`);
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
  await loadConfig();
  await initTheme();
  render();

  window.addEventListener('resize', onResize);
  gallery.addEventListener('scroll', onGalleryScroll);

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.chats || changes.columns) {
      loadConfig().then(render);
    }
  });
}

init();

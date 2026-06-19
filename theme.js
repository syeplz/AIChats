const THEME_KEY = 'theme';

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode) {
  const theme = mode === 'system' ? getSystemTheme() : mode;
  document.documentElement.dataset.theme = theme;
}

async function getStoredTheme() {
  const { theme } = await chrome.storage.sync.get(THEME_KEY);
  return theme || 'system';
}

async function initTheme() {
  const mode = await getStoredTheme();
  applyTheme(mode);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    const current = await getStoredTheme();
    if (current === 'system') applyTheme('system');
  });

  return mode;
}

async function setTheme(mode) {
  await chrome.storage.sync.set({ theme: mode });
  applyTheme(mode);
}

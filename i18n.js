let messages = null;

async function initI18n() {
  const savedLocale = await store.get('locale') || 'zh_CN';
  try {
    const resp = await fetch(`_locales/${savedLocale}/messages.json`);
    messages = await resp.json();
  } catch {
    const resp = await fetch('_locales/zh_CN/messages.json');
    messages = await resp.json();
  }
  document.documentElement.lang = (savedLocale === 'zh_CN' ? 'zh-CN' : savedLocale);
}

function _(key, subs = []) {
  if (!messages) return key;
  const msg = messages[key]?.message;
  if (!msg) return key;
  if (!subs.length) return msg;
  return subs.reduce((s, v, i) => s.replace(`$${i + 1}`, v), msg);
}

function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = _(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = _(el.dataset.i18nTitle);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = _(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    el.setAttribute('aria-label', _(el.dataset.i18nAriaLabel));
  });
}

const DEFAULT_PROMPT_IDS = new Set(['p_intro', 'p_summarize', 'p_whatis', 'p_clipboard']);

function localizePrompt(p) {
  if (!p.isDefault) return p;
  const labelKey = `prompts_${p.id}_label`;
  const contentKey = `prompts_${p.id}_content`;
  const localizedLabel = _(labelKey);
  if (localizedLabel === labelKey) return p;
  return { ...p, label: localizedLabel, content: _(contentKey) };
}

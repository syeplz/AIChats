#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PROMPTS_DIR = path.join(ROOT, 'prompts');
const LOCALES_DIR = path.join(ROOT, '_locales');
const BACKGROUND_JS = path.join(ROOT, 'background.js');
const I18N_JS = path.join(ROOT, 'i18n.js');

function parseMd(content) {
  const parts = content.split('---');
  if (parts.length < 2) return null;

  const meta = {};
  for (const line of parts[0].trim().split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  meta.content = parts.slice(1).join('---').trim();
  return meta;
}

function readPrompts(lang) {
  const dir = path.join(PROMPTS_DIR, lang);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => parseMd(fs.readFileSync(path.join(dir, f), 'utf8')))
    .filter(Boolean)
    .sort((a, b) => (parseInt(a.order) || 99) - (parseInt(b.order) || 99));
}

function updateMessagesJson(lang, prompts) {
  const filePath = path.join(LOCALES_DIR, lang, 'messages.json');
  if (!fs.existsSync(filePath)) return;
  const messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const activeIds = new Set(prompts.map(p => p.id));

  for (const p of prompts) {
    const labelKey = `prompts_${p.id}_label`;
    const contentKey = `prompts_${p.id}_content`;

    if (messages[labelKey]) {
      messages[labelKey].message = p.label;
    } else {
      messages[labelKey] = {
        message: p.label,
        description: `Default prompt: ${p.id} label`,
      };
    }

    if (messages[contentKey]) {
      messages[contentKey].message = p.content;
    } else {
      messages[contentKey] = {
        message: p.content,
        description: `Default prompt: ${p.id} content`,
      };
    }
  }

  // remove orphaned prompt keys
  let removed = 0;
  for (const key of Object.keys(messages)) {
    const m = key.match(/^prompts_(p_\w+)_(label|content)$/);
    if (m && !activeIds.has(m[1])) {
      delete messages[key];
      removed++;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(messages, null, 2) + '\n');
  const extra = removed ? `, removed ${removed} orphaned` : '';
  console.log(`  Updated ${filePath}${extra}`);
}

function updateBackgroundJs(prompts) {
  let src = fs.readFileSync(BACKGROUND_JS, 'utf8');
  const startMarker = '// >>> SYNCED_PROMPTS_START';
  const endMarker = '// >>> SYNCED_PROMPTS_END';

  const lines = prompts.map((p, i) => {
    const comma = i < prompts.length - 1 ? ',' : '';
    const label = p.label.replace(/'/g, "\\'");
    const content = p.content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    return `      { id: '${p.id}', isDefault: ${p.isDefault === 'true'}, enabled: ${p.enabled === 'true'}, fillInput: ${p.fillInput !== 'false'}, autoSubmit: ${p.autoSubmit !== 'false'}, label: '${label}', content: \`${content}\` }${comma}`;
  });
  const block = `${startMarker}\n${lines.join('\n')}\n      ${endMarker}`;

  const markerPattern = /\/\/ >>> SYNCED_PROMPTS_START[\s\S]*?\/\/ >>> SYNCED_PROMPTS_END/g;
  const matches = src.match(markerPattern);
  const count = matches ? matches.length : 0;
  if (count > 0) {
    src = src.replace(markerPattern, block);
  }

  if (count === 0) {
    console.error('  Marker comments not found in background.js. Run with --init first.');
    process.exit(1);
  }

  fs.writeFileSync(BACKGROUND_JS, src);
  console.log(`  Updated ${BACKGROUND_JS} (${count} block${count > 1 ? 's' : ''})`);
}

function updateI18nJs(prompts) {
  let src = fs.readFileSync(I18N_JS, 'utf8');
  const startMarker = '// >>> SYNCED_PROMPT_IDS_START';
  const endMarker = '// >>> SYNCED_PROMPT_IDS_END';

  const ids = prompts.map(p => `'${p.id}'`).join(', ');
  const line = `const DEFAULT_PROMPT_IDS = new Set([${ids}]);`;
  const block = `${startMarker}\n${line}\n${endMarker}`;

  const pattern = /\/\/ >>> SYNCED_PROMPT_IDS_START[\s\S]*?\/\/ >>> SYNCED_PROMPT_IDS_END/g;
  if (src.match(pattern)) {
    src = src.replace(pattern, block);
  } else {
    // first time: replace the existing line
    src = src.replace(
      /const DEFAULT_PROMPT_IDS = new Set\(\[.*?\]\);/,
      block
    );
  }

  fs.writeFileSync(I18N_JS, src);
  console.log(`  Updated ${I18N_JS}`);
}

function checkMissingLanguages(allPrompts) {
  const langs = Object.keys(allPrompts);
  if (langs.length <= 1) return;

  const allIds = new Set();
  for (const ps of Object.values(allPrompts)) {
    for (const p of ps) allIds.add(p.id);
  }

  for (const [lang, ps] of Object.entries(allPrompts)) {
    const ids = new Set(ps.map(p => p.id));
    for (const id of allIds) {
      if (!ids.has(id)) {
        console.warn(`  WARNING: [${lang}] missing prompt "${id}" — will fall back to zh_CN at runtime`);
      }
    }
  }
}

function initMarkers() {
  let src = fs.readFileSync(BACKGROUND_JS, 'utf8');
  if (src.includes('// >>> SYNCED_PROMPTS_START')) {
    console.log('  Markers already exist in background.js.');
  } else {
    const startRe = /(\[\s*\n\s*\{ id: 'p_intro')/;
    const match = src.match(startRe);
    if (!match) {
      console.error('  Could not find DEFAULT_PROMPTS array in background.js');
      process.exit(1);
    }
    const startIdx = src.indexOf(match[0]);
    const arrStart = src.lastIndexOf('[', startIdx);
    let depth = 0, arrEnd = arrStart;
    for (let i = arrStart; i < src.length; i++) {
      if (src[i] === '[') depth++;
      if (src[i] === ']') depth--;
      if (depth === 0) { arrEnd = i + 1; break; }
    }
    const arrContent = src.slice(arrStart, arrEnd);
    src = src.slice(0, arrStart)
      + '// >>> SYNCED_PROMPTS_START\n' + arrContent.slice(1, -1) + '\n      // >>> SYNCED_PROMPTS_END'
      + src.slice(arrEnd);
    fs.writeFileSync(BACKGROUND_JS, src);
    console.log(`  Initialized markers in ${BACKGROUND_JS}`);
  }

  let i18nSrc = fs.readFileSync(I18N_JS, 'utf8');
  if (i18nSrc.includes('// >>> SYNCED_PROMPT_IDS_START')) {
    console.log('  Markers already exist in i18n.js.');
  } else {
    i18nSrc = i18nSrc.replace(
      /const DEFAULT_PROMPT_IDS = new Set\(\[.*?\]\);/,
      '// >>> SYNCED_PROMPT_IDS_START\nconst DEFAULT_PROMPT_IDS = new Set([]);\n// >>> SYNCED_PROMPT_IDS_END'
    );
    fs.writeFileSync(I18N_JS, i18nSrc);
    console.log(`  Initialized markers in ${I18N_JS}`);
  }
}

// --- main ---

const args = process.argv.slice(2);
const isInit = args.includes('--init');

console.log('sync-prompts:');

if (isInit) {
  initMarkers();
  console.log('Done. Markers initialized.');
  process.exit(0);
}

const langs = fs.readdirSync(PROMPTS_DIR).filter(d => {
  return fs.statSync(path.join(PROMPTS_DIR, d)).isDirectory();
});

const allPrompts = {};
for (const lang of langs) {
  allPrompts[lang] = readPrompts(lang);
}

checkMissingLanguages(allPrompts);

for (const [lang, prompts] of Object.entries(allPrompts)) {
  console.log(`[${lang}]`);
  if (prompts.length === 0) {
    console.log('  No prompts found, skipping.');
    continue;
  }
  updateMessagesJson(lang, prompts);

  if (lang === 'zh_CN') {
    updateBackgroundJs(prompts);
    updateI18nJs(prompts);
  }
}

console.log('Done.');

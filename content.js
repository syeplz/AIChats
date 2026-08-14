(function() {
  const SOURCE = 'aichats-chipbar';

  function log(...args) { console.log('[AIChats]', ...args); }
  function warn(...args) { console.warn('[AIChats]', ...args); }
  function error(...args) { console.error('[AIChats]', ...args); }

  function desc(el) {
    let s = el.tagName;
    if (el.id) s += '#' + el.id;
    if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
    return s;
  }

  function isVisible(el) {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findInput() {
    const candidates = [];
    const selectors = [
      'textarea:not([disabled]):not([readonly])',
      'div[contenteditable="true"]',
      '[role="textbox"]:not([disabled])',
      'input[type="text"]:not([disabled]):not([readonly])',
    ];
    for (const sel of selectors) {
      try {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (!isVisible(el)) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width < 50 || rect.height < 20) continue;
          candidates.push({ el, rect });
        }
      } catch (e) {}
    }
    if (candidates.length === 0) {
      warn('findInput: no candidates found');
      return null;
    }
    if (candidates.length === 1) {
      log('findInput: single candidate', desc(candidates[0].el));
      return candidates[0].el;
    }

    for (const c of candidates) {
      let score = 0;
      const area = c.rect.width * c.rect.height;
      score += area;
      const bottomDist = window.innerHeight - c.rect.bottom;
      score += Math.max(0, 600 - bottomDist) * 5;
      const label = (c.el.getAttribute('aria-label') || '') + ' ' + (c.el.getAttribute('placeholder') || '');
      const lower = label.toLowerCase();
      if (/send|message|chat|输入|消息|聊天|prompt|ask/.test(lower)) score += 500;
      if (/search|email|name|password/.test(lower)) score -= 300;
      if (c.el.tagName === 'TEXTAREA') score += 300;
      if (c.el.parentElement && c.el.parentElement.querySelector('button')) score += 200;
      c.score = score;
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    log('findInput: scored', candidates.length, 'candidates, picked', desc(best.el), 'score=' + best.score);
    return best.el;
  }

  function setCursorAtEnd(el) {
    try {
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        el.setSelectionRange(el.value.length, el.value.length);
      } else if (el.isContentEditable) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch (e) {
      console.warn('[AIChats] setCursorAtEnd failed:', e);
    }
  }

  function fillInput(el, text) {
    if (!text) {
      el.focus();
      log('fillInput: empty text, focus only');
      return;
    }
    el.focus();
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      log('fillInput: set value on', desc(el), 'length=' + text.length);
    } else if (el.isContentEditable) {
      el.textContent = text;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      log('fillInput: set textContent on', desc(el), 'length=' + text.length);
    } else {
      warn('fillInput: unsupported element type', desc(el));
      return;
    }
    setCursorAtEnd(el);
    requestAnimationFrame(() => setCursorAtEnd(el));
  }

  function findSubmitButton(input) {
    const container = input.closest('form') || input.closest('[class*="input"]') || input.closest('[class*="footer"]') || input.parentElement;
    if (container) {
      for (const btn of container.querySelectorAll('button:not([disabled])')) {
        const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
        if (/send|submit|发送|提交/.test(aria)) {
          log('findSubmitButton: found by aria-label in container', desc(btn));
          return btn;
        }
      }
    }
    for (const btn of document.querySelectorAll('button:not([disabled])')) {
      const testId = (btn.getAttribute('data-testid') || '').toLowerCase();
      if (/send|submit/.test(testId)) {
        log('findSubmitButton: found by data-testid', desc(btn));
        return btn;
      }
    }
    for (const btn of document.querySelectorAll('button:not([disabled])')) {
      const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
      if (/send|submit|发送|提交/.test(aria)) {
        log('findSubmitButton: found by aria-label globally', desc(btn));
        return btn;
      }
    }
    warn('findSubmitButton: no submit button found (will fallback to Enter)');
    return null;
  }

  function submit(input, submitByEnter) {
    if (submitByEnter) {
      log('submit: dispatching Enter (submitByEnter=true)');
      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
        bubbles: true, cancelable: true
      }));
      return;
    }
    const btn = findSubmitButton(input);
    if (btn) {
      log('submit: clicking', desc(btn));
      btn.click();
      return;
    }
    log('submit: no button found, dispatching Enter');
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
      bubbles: true, cancelable: true
    }));
  }

  // Most recently handled message gen, so re-sent messages don't double-fill.
  let lastGen = null;

  // The input box may not be ready when the panel first talks to us (slow chat
  // sites). Retry a few times before giving up.
  function findInputWithRetry(retries, interval) {
    return new Promise((resolve) => {
      let attempts = 0;
      const tryFind = () => {
        attempts += 1;
        const input = findInput();
        if (input || attempts >= retries) {
          resolve(input);
          return;
        }
        setTimeout(tryFind, interval);
      };
      tryFind();
    });
  }

  // ---- Session snapshot: remember the active conversation + unsent draft so a
  // fresh panel load can land back on the same conversation. Only runs in the
  // panel iframe (embedded), so normal tabs never clobber or restore it.
  const SNAP_KEY = 'aichats-snapshot';
  const SNAP_DEBOUNCE = 800;
  const SNAP_INTERVAL = 1500;
  const RETRY_KEY = 'aichats-drop-retry';
  const embedded = window.self !== window.top;

  let snapTimer = null;
  let currentInput = null;
  let lastHref = location.href;
  let userActive = false;
  let draftRestored = false;
  let restoring = false;

  function snapOrigin() {
    try { return new URL(location.href).origin; } catch { return ''; }
  }

  function readInputValue(el) {
    if (!el) return '';
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value || '';
    if (el.isContentEditable) return el.textContent || '';
    return '';
  }

  // Home/new-chat pages (root, /chat, /chat/new, auth pages...) are NOT real
  // conversations. Persisting them with an empty draft would clobber the last
  // real conversation and turn every reopen into a fresh session.
  function isHomeLike(url) {
    try {
      const p = new URL(url).pathname;
      if (/^\/(auth|login|signin|sign-up|logout)/i.test(p)) return true;
      const segs = p.split('/').filter(Boolean);
      if (segs.length === 0) return true;
      if (segs[0] === 'new' || segs[0] === 'new-chat') return true;
      if (segs.length === 1 && (segs[0] === 'chat' || segs[0] === 'home' || segs[0] === 'welcome')) return true;
      if (segs.length === 2 && segs[0] === 'chat' && segs[1] === 'new') return true;
      if (segs.length === 2 && segs[0] === 'a' && segs[1] === 'chat') return true;
    } catch {}
    return false;
  }

  function persistSnapshot(url, draft) {
    if (isHomeLike(url) && !(draft && draft.trim())) return;
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      const origin = snapOrigin();
      if (!origin) return;
      chrome.storage.session.get(SNAP_KEY).then(res => {
        const all = res[SNAP_KEY] || {};
        all[origin] = { url, draft: draft || '', ts: Date.now() };
        chrome.storage.session.set({ [SNAP_KEY]: all });
      });
    }, SNAP_DEBOUNCE);
  }

  function clearSnapshot() {
    const origin = snapOrigin();
    chrome.storage.session.get(SNAP_KEY).then(res => {
      const all = res[SNAP_KEY] || {};
      if (all[origin]) {
        delete all[origin];
        chrome.storage.session.set({ [SNAP_KEY]: all });
      }
    });
  }

  function readSnapshot() {
    return chrome.storage.session.get(SNAP_KEY).then(res =>
      (res[SNAP_KEY] || {})[snapOrigin()] || null
    );
  }

  function attachInput(el) {
    if (!el || el === currentInput) return;
    currentInput = el;
    el.addEventListener('input', () => {
      persistSnapshot(location.href, readInputValue(el));
    });
  }

  async function tryRestoreDraft() {
    if (restoring || draftRestored) return;
    const snap = await readSnapshot();
    if (!snap || !snap.draft) { draftRestored = true; return; }
    if (snap.url && snap.url !== location.href) { draftRestored = true; return; }
    restoring = true;
    try {
      const input = await findInputWithRetry(10, 600);
      if (!input) return;
      draftRestored = true;
      attachInput(input);
      if (readInputValue(input).trim()) return;
      fillInput(input, snap.draft);
      log('restoreDraft: restored draft length=' + snap.draft.length);
    } finally {
      restoring = false;
    }
  }

  // Slow-load sites sometimes drop the conversation back to home during
  // hydration. Re-point the frame at the saved conversation once per panel
  // open so the (now warm) site can actually load it.
  function retryDrop() {
    if (sessionStorage.getItem(RETRY_KEY)) return;
    readSnapshot().then(snap => {
      if (!snap || !snap.url || isHomeLike(snap.url)) return;
      if (snap.url === location.href) return;
      if (userActive) return;
      sessionStorage.setItem(RETRY_KEY, '1');
      log('restoreSession: retrying navigation to ' + snap.url);
      location.assign(snap.url);
    });
  }

  function startSnapshotWatcher() {
    lastHref = location.href;
    setInterval(() => {
      if (location.href !== lastHref) {
        const prev = lastHref;
        lastHref = location.href;
        if (isHomeLike(lastHref)) {
          if (userActive) {
            clearSnapshot();
          } else if (!isHomeLike(prev)) {
            retryDrop();
          }
        } else {
          persistSnapshot(lastHref, currentInput ? readInputValue(currentInput) : '');
        }
      }
      if (currentInput && !document.contains(currentInput)) {
        const fresh = findInput();
        if (fresh) {
          attachInput(fresh);
          tryRestoreDraft();
        }
      } else if (!currentInput) {
        tryRestoreDraft();
      }
    }, SNAP_INTERVAL);
  }

  if (embedded) {
    tryRestoreDraft();
    window.addEventListener('pointerdown', () => { userActive = true; });
    window.addEventListener('keydown', () => { userActive = true; });
    window.addEventListener('wheel', () => { userActive = true; });
    if (isHomeLike(location.href)) retryDrop();
    startSnapshotWatcher();
  }

  window.addEventListener('message', async (event) => {
    const msg = event.data;
    if (!msg || msg.source !== SOURCE || msg.type !== 'fill-input') return;
    if (msg.gen === lastGen) {
      // Already handled; the panel likely missed our ack. Re-send it so the
      // panel can restore the clipboard, but do not fill again.
      log('message: duplicate gen=' + msg.gen + ', resending ack');
      try {
        window.parent.postMessage({ source: 'aichats-content', type: 'fill-input-ack', gen: msg.gen }, '*');
      } catch (e) {}
      return;
    }
    log('message received, autoSubmit=' + msg.autoSubmit, 'text.length=' + msg.text.length, 'submitByEnter=' + msg.submitByEnter);
    const input = await findInputWithRetry(3, 500);
    if (msg.gen === lastGen) {
      // A concurrent retry filled already; just confirm.
      try {
        window.parent.postMessage({ source: 'aichats-content', type: 'fill-input-ack', gen: msg.gen }, '*');
      } catch (e) {}
      return;
    }
    if (!input) {
      warn('message: input not found after retries, abort');
      return;
    }
    lastGen = msg.gen;
    fillInput(input, msg.text);
    try {
      window.parent.postMessage({ source: 'aichats-content', type: 'fill-input-ack', gen: msg.gen }, '*');
      log('fill-input-ack sent, gen=' + msg.gen);
    } catch (e) {
      warn('fill-input-ack send failed:', e);
    }
    if (msg.autoSubmit) {
      setTimeout(() => submit(input, msg.submitByEnter), 300);
    }
  });
})();

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

  function fillInput(el, text) {
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
    }
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

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || msg.source !== SOURCE || msg.type !== 'fill-input') return;
    log('message received, autoSubmit=' + msg.autoSubmit, 'text.length=' + msg.text.length, 'submitByEnter=' + msg.submitByEnter);
    const input = findInput();
    if (!input) {
      warn('message: input not found, abort');
      return;
    }
    fillInput(input, msg.text);
    if (msg.autoSubmit) {
      setTimeout(() => submit(input, msg.submitByEnter), 150);
    }
  });
})();

(function() {
  const SOURCE = 'aichats-chipbar';

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
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0].el;

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
    return candidates[0].el;
  }

  function fillInput(el, text) {
    el.focus();
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (el.isContentEditable) {
      el.textContent = text;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    }
  }

  function findSubmitButton(input) {
    const container = input.closest('form') || input.closest('[class*="input"]') || input.closest('[class*="footer"]') || input.parentElement;
    if (container) {
      const btns = container.querySelectorAll('button:not([disabled])');
      for (const btn of btns) {
        const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
        if (/send|submit|发送|提交/.test(aria)) return btn;
      }
      const lastBtn = btns[btns.length - 1];
      if (lastBtn) return lastBtn;
    }
    const allBtns = document.querySelectorAll('button:not([disabled])');
    for (const btn of allBtns) {
      const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
      if (/send|submit|发送|提交/.test(aria)) return btn;
    }
    const lastBtn = allBtns[allBtns.length - 1];
    if (lastBtn) return lastBtn;
    return null;
  }

  function submit(input) {
    const btn = findSubmitButton(input);
    if (btn) {
      btn.click();
      return;
    }
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
  }

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || msg.source !== SOURCE || msg.type !== 'fill-input') return;
    const input = findInput();
    if (!input) return;
    fillInput(input, msg.text);
    if (msg.autoSubmit) {
      setTimeout(() => submit(input), 150);
    }
  });
})();

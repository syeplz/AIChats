function isImageCT(ct) {
  return !ct.startsWith('text/') || ct === 'text/xml';
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
        if (isImageCT(ct)) { r.body?.cancel(); return c; }
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
        if (isImageCT(ct)) { r.body?.cancel(); return c; }
        r.body?.cancel();
      }
    } catch {}
  }
  return '';
}

async function upgradeIcon(img, chat) {
  const googlePrefix = 'https://www.google.com/s2/favicons?domain=';

  if (chat.icon.startsWith(googlePrefix)) return;

  const origin = new URL(chat.url).origin;

  try {
    const resp = await fetch(chat.icon, {
      signal: AbortSignal.timeout(3000),
      headers: { 'Referer': origin + '/' }
    });
    if (resp.ok) {
      const ct = resp.headers.get('Content-Type') || '';
      if (isImageCT(ct)) {
        const blob = await resp.blob();
        img.src = URL.createObjectURL(blob);
        return;
      }
    }
  } catch {}

  const hostname = new URL(chat.url).hostname;
  img.src = `${googlePrefix}${hostname}&sz=32`;
}

async function setFaviconSrc(img, iconUrl, siteUrl) {
  img.src = iconUrl;
}

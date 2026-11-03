// Liveness probe injected into every embedded chat frame.
//
// A frame that Chrome refuses to display (X-Frame-Options / CSP
// frame-ancestors) is replaced by an error page that runs no scripts, so it
// can neither announce itself nor answer a postMessage. The side panel treats
// silence as "this frame is not our chat site" and offers a way out.
//
// A one-shot `ready` alone is not enough: a site can load fine and then
// redirect itself to an unembeddable sign-in domain, and at that moment the
// panel loses the message source identity it would need to attribute a
// farewell message. Heartbeat replies are attributable, so the panel keeps
// pinging and notices when the replies stop. See probeByChat in sidepanel.js.
//
// Kept separate from content.js on purpose: script injection is a per-site
// feature toggle, but knowing whether a site failed to load must not depend
// on it.
(function () {
  if (window.self === window.top) return;

  const CONTENT = 'aichats-content';
  const PANEL = 'aichats-chipbar';

  function post(type) {
    try {
      window.parent.postMessage({
        source: CONTENT,
        type: type,
        href: location.href,
      }, '*');
    } catch (e) {}
  }

  post('probe-ready');

  window.addEventListener('message', function (event) {
    const msg = event.data;
    if (!msg || msg.source !== PANEL || msg.type !== 'probe-ping') return;
    post('probe-pong');
  });
})();

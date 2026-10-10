// Update check. The deployed build publishes version.json ({id}); when the id differs from
// the one compiled into this bundle, the new page and its script are fetched (so the
// restart is quick and works even if the connection drops) and then a pop-up offers a
// restart. Restart navigates to ./?v=<id>: GitHub Pages lets browsers cache index.html
// for 10 minutes, and a plain reload could hand back the old page.

export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'test';
const POLL_MS = 5 * 60 * 1000;
const JUST_RESTARTED = 'nico-restarted-into';

/** Is there something newer to restart into? (Not if it's this build, or the build we
 * just restarted into and the page cache is still handing us the old one.) */
export function needsUpdate(current: string, fetched: string | null | undefined, restartedInto: string | null = null): boolean {
  return !!fetched && fetched !== current && fetched !== restartedInto;
}

/** Script and stylesheet URLs referenced by a built index.html. */
export function assetUrls(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/g)) if (/\.(js|css)(\?|$)/.test(m[1])) out.push(m[1]);
  return out;
}

async function fetchId(): Promise<string | null> {
  try {
    const r = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    return r.ok ? ((await r.json()) as { id?: string }).id ?? null : null;
  } catch { return null; }
}

async function preload(id: string): Promise<boolean> {
  try {
    const page = await fetch(`./?v=${encodeURIComponent(id)}`, { cache: 'reload' });
    if (!page.ok) return false;
    await Promise.all(assetUrls(await page.text()).map(u => fetch(new URL(u, page.url)).then(r => r.ok)));
    return true;
  } catch { return false; }
}

export interface Updater { check(manual?: boolean): Promise<'current' | 'ready' | 'offline'> }

/** Start polling; `beforeRestart` runs just before the page is replaced (save the game). */
export function startUpdates(beforeRestart: () => void): Updater {
  let restartedInto: string | null = null;
  try {
    restartedInto = sessionStorage.getItem(JUST_RESTARTED);
    // tidy the address after a restart: drop ?v=, keep anything else (like ?debug)
    const q = new URLSearchParams(location.search);
    if (q.has('v')) { q.delete('v'); const rest = q.toString(); history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : '')); }
  } catch { /* storage blocked */ }

  const pop = document.getElementById('update')!;
  let shown: string | null = null, busy = false;
  const toast = document.getElementById('toast')!;
  let toastTimer = 0;
  const say = (msg: string) => {
    toast.textContent = msg; toast.classList.add('on');
    clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toast.classList.remove('on'), 2200);
  };

  document.getElementById('update-restart')!.addEventListener('click', () => {
    if (!shown) return;
    beforeRestart();
    try { sessionStorage.setItem(JUST_RESTARTED, shown); } catch { /* fine */ }
    const q = new URLSearchParams(location.search); q.set('v', shown);
    location.replace(`${location.pathname}?${q}`);
  });
  document.getElementById('update-later')!.addEventListener('click', () => { pop.hidden = true; });

  async function check(manual = false): Promise<'current' | 'ready' | 'offline'> {
    if (busy) return 'current';
    busy = true;
    try {
      const id = await fetchId();
      if (id === null) { if (manual) say("Can't reach the internet right now"); return 'offline'; }
      if (!needsUpdate(BUILD_ID, id, manual ? null : restartedInto)) { if (manual) say("You're on the newest version"); return 'current'; }
      if (shown !== id) {
        if (manual) say('Downloading the update…');
        if (!(await preload(id))) { if (manual) say("Couldn't download the update"); return 'offline'; }
        shown = id;
      }
      pop.hidden = false;
      return 'ready';
    } finally { busy = false; }
  }

  setInterval(() => check(), POLL_MS);
  // a home-screen app is suspended, not reloaded, when he switches away: check on return
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  window.addEventListener('pageshow', e => { if (e.persisted) check(); });
  setTimeout(() => check(), 3000);
  return { check };
}

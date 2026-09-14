/**
 * The browser bots — real Chrome tabs navigating mWeb.
 *
 * The HTTP bots measure what the API can take; these measure what a person
 * FEELS while it is taking it: the page load a phone-sized Chrome sees, with the
 * JavaScript bundle, the GraphQL waterfall and the images all in it. A handful
 * is enough — the point is realism, not volume.
 *
 * Driven over the Chrome DevTools Protocol with Node's built-in WebSocket, so
 * the runner installs nothing: GitHub's ubuntu image already ships Chrome.
 *
 * These tabs cannot send the stress header — Chrome would add it to every
 * cross-origin request, and the image CDN's CORS preflight would refuse it — so
 * their user agent names them instead, and the server's pulse leaves that agent
 * out of its visitor count.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const NAVIGATION_TIMEOUT_MS = 45_000;
/** A single-page app keeps fetching after `load`; give it time to paint its data. */
const SETTLE_MS = 1500;
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 3, mobile: true };
const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36 DuncitStressBot/1.0';

async function devToolsPort(profileDir) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const text = await readFile(path.join(profileDir, 'DevToolsActivePort'), 'utf8');
      const port = Number.parseInt(text.split('\n')[0], 10);
      if (port > 0) return port;
    } catch {
      // Chrome has not written it yet.
    }
    await sleep(200);
  }
  throw new Error('Chrome did not open its DevTools port within 30 seconds.');
}

/** One CDP session over one tab's WebSocket. */
function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let nextId = 0;
    const pending = new Map();
    const listeners = new Map();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && pending.has(msg.id)) {
        const { ok, fail } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) fail(new Error(msg.error.message));
        else ok(msg.result);
        return;
      }
      for (const fn of listeners.get(msg.method) ?? []) fn(msg.params);
    });
    ws.addEventListener('error', () => reject(new Error('Could not connect to the Chrome tab.')));
    ws.addEventListener('open', () =>
      resolve({
        send(method, params = {}) {
          nextId += 1;
          const id = nextId;
          ws.send(JSON.stringify({ id, method, params }));
          return new Promise((ok, fail) => pending.set(id, { ok, fail }));
        },
        on(method, fn) {
          listeners.set(method, [...(listeners.get(method) ?? []), fn]);
        },
        /** Listen for the next event only — a navigation waits once per page. */
        once(method, fn) {
          const wrapper = (params) => {
            listeners.set(method, (listeners.get(method) ?? []).filter((l) => l !== wrapper));
            fn(params);
          };
          listeners.set(method, [...(listeners.get(method) ?? []), wrapper]);
        },
        close: () => ws.close(),
      })
    );
  });
}

/** Resolves on the event; rejects on the timeout, or at once when the run is stopped. */
function waitFor(session, method, timeoutMs, signal) {
  const waiting = new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('stopped'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      reject(new Error(`timed out waiting for ${method}`));
    }, timeoutMs);
    signal.addEventListener('abort', onAbort, { once: true });
    session.once(method, () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      resolve();
    });
  });
  // Handled here as well as by the awaiting caller: it can reject before the caller reaches its await.
  waiting.catch(() => undefined);
  return waiting;
}

const TIMING_SCRIPT = `JSON.stringify((() => {
  const n = performance.getEntriesByType('navigation')[0];
  return n ? { ttfb: n.responseStart - n.requestStart, load: n.loadEventEnd - n.startTime } : null;
})())`;

async function navigate(session, url, signal) {
  const loaded = waitFor(session, 'Page.loadEventFired', NAVIGATION_TIMEOUT_MS, signal);
  const started = performance.now();
  const result = await session.send('Page.navigate', { url });
  if (result.errorText) throw new Error(result.errorText);
  await loaded;
  const wall = performance.now() - started;
  await sleep(SETTLE_MS);
  const timing = await session.send('Runtime.evaluate', { expression: TIMING_SCRIPT, returnByValue: true });
  const parsed = timing.result?.value ? JSON.parse(timing.result.value) : null;
  return Math.round(parsed?.load > 0 ? parsed.load : wall);
}

async function browserBot(index, port, ctx, states) {
  const state = { bot: `browser-${ctx.shard + 1}-${index + 1}`, kind: 'BROWSER', journey: '', page: '', status: 'starting', load_ms: 0, at: '' };
  states.push(state);
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const session = await connect(target.webSocketDebuggerUrl);
  let jsErrors = 0;
  session.on('Runtime.exceptionThrown', () => {
    jsErrors += 1;
  });
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Emulation.setDeviceMetricsOverride', MOBILE);
  await session.send('Emulation.setUserAgentOverride', { userAgent: USER_AGENT });
  const pages = ctx.journeys.filter((j) => j.page);
  let iteration = index;
  try {
    while (!ctx.stopped() && pages.length > 0) {
      const journey = pages[iteration % pages.length];
      const page = journey.page();
      iteration += 1;
      Object.assign(state, { journey: journey.name, page, status: 'loading', at: new Date().toISOString() });
      const errorsBefore = jsErrors;
      try {
        const ms = await navigate(session, `${ctx.mwebUrl}${page}`, ctx.abort.signal);
        ctx.metrics.navigation(ms, true);
        const status = jsErrors > errorsBefore ? 'loaded-js-errors' : 'loaded';
        Object.assign(state, { status, load_ms: ms, at: new Date().toISOString() });
      } catch (err) {
        if (ctx.abort.signal.aborted) break;
        ctx.metrics.navigation(0, false);
        ctx.noteError(`browser ${page}`, err.message);
        Object.assign(state, { status: 'error', at: new Date().toISOString() });
      }
      await sleep(Math.max(1000, ctx.thinkTimeMs * 2), undefined, { signal: ctx.abort.signal }).catch(() => undefined);
    }
  } finally {
    state.status = 'stopped';
    session.close();
  }
}

/**
 * Launch one headless Chrome with `count` tabs. The handle reports how many
 * tabs are walking and what each is on; `close()` stops them and the browser.
 */
export async function startBrowserBots(ctx, count) {
  if (count <= 0) {
    return { activeCount: () => 0, visibleStates: () => [], close: async () => undefined };
  }
  const profileDir = await mkdtemp(path.join(tmpdir(), 'stress-chrome-'));
  const chrome = spawn(
    process.env.CHROME_PATH,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--remote-debugging-port=0',
      `--user-data-dir=${profileDir}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );
  const port = await devToolsPort(profileDir);
  const states = [];
  const bots = Array.from({ length: count }, (_, i) =>
    browserBot(i, port, ctx, states).catch((err) => ctx.noteError('browser bot', err.message))
  );
  return {
    activeCount: () => states.filter((s) => s.status !== 'stopped').length,
    visibleStates: () => states,
    async close() {
      await Promise.allSettled(bots);
      chrome.kill('SIGTERM');
      await rm(profileDir, { recursive: true, force: true }).catch(() => undefined);
    },
  };
}

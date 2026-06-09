/**
 * Client logic for the Duncit status page:
 *  - live reachability badges (opaque no-cors fetch, every 60s)
 *  - an on-demand "Details" dialog showing the real HTTP status code + TLS
 *    certificate, fetched from the API's server-side probe (/status/probe).
 */
const SERVER_BASE = import.meta.env.PROD
  ? 'https://server.duncit.com'
  : 'http://localhost:2001';
const REFRESH_MS = 60_000;
const PROBE_TIMEOUT_MS = 8000;

interface SslInfo {
  authorized: boolean;
  issuer: string | null;
  subject: string | null;
  validFrom: string | null;
  validTo: string | null;
  daysRemaining: number | null;
  protocol: string | null;
}
interface ProbeResult {
  url: string;
  ok: boolean;
  statusCode: number | null;
  statusText: string | null;
  ssl: SslInfo | null;
  error?: string;
}

const reachable = (url: string): Promise<boolean> =>
  new Promise((resolve) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      ctrl.abort();
      resolve(false);
    }, PROBE_TIMEOUT_MS);
    fetch(url, { mode: 'no-cors', signal: ctrl.signal, cache: 'no-store' })
      .then(() => {
        clearTimeout(timer);
        resolve(true);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
  });

function setBadge(el: Element, ok: boolean): void {
  el.className = 'badge ' + (ok ? 'ok' : 'down');
  el.innerHTML =
    '<span class="dot ' +
    (ok ? 'ok' : 'down') +
    '"></span><span class="label">' +
    (ok ? 'Operational' : 'Unreachable') +
    '</span>';
}

async function runBadges(): Promise<void> {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.card'));
  let up = 0;
  await Promise.all(
    cards.map(async (card) => {
      const url = card.dataset.url;
      const badge = card.querySelector('.badge');
      if (!url || !badge) return;
      const ok = await reachable(url);
      if (ok) up += 1;
      setBadge(badge, ok);
    }),
  );
  const total = cards.length;
  const dot = document.getElementById('overall-dot');
  const text = document.getElementById('overall-text');
  const updated = document.getElementById('updated');
  if (dot)
    dot.className =
      'dot ' + (up === total ? 'ok' : up === 0 ? 'down' : 'pending');
  if (text)
    text.textContent =
      up === total
        ? 'All systems operational'
        : `${up} of ${total} services operational`;
  if (updated)
    updated.textContent = 'Last checked ' + new Date().toLocaleTimeString();
}

const escapeHtml = (s: string): string =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c,
  );

const fmtDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

const row = (label: string, value: string): string =>
  `<div class="d-row"><span class="d-label">${label}</span><span class="d-value">${value}</span></div>`;

function renderDetails(result: ProbeResult): string {
  const code =
    result.statusCode !== null
      ? `${result.statusCode} ${result.statusText ?? ''}`.trim()
      : (result.error ?? 'Unreachable');
  const rows = [
    row(
      'HTTP status',
      `<span class="pill ${result.ok ? 'ok' : 'down'}">${escapeHtml(code)}</span>`,
    ),
  ];
  const ssl = result.ssl;
  if (ssl) {
    const expiry =
      ssl.daysRemaining !== null
        ? `${fmtDate(ssl.validTo)} · ${ssl.daysRemaining} days left`
        : fmtDate(ssl.validTo);
    rows.push(
      row(
        'SSL',
        `<span class="pill ${ssl.authorized ? 'ok' : 'down'}">${ssl.authorized ? 'Valid & trusted' : 'Not trusted'}</span>`,
      ),
      row('Issuer', escapeHtml(ssl.issuer ?? '—')),
      row('Subject', escapeHtml(ssl.subject ?? '—')),
      row('Protocol', escapeHtml(ssl.protocol ?? '—')),
      row('Valid from', fmtDate(ssl.validFrom)),
      row('Expires', escapeHtml(expiry)),
    );
  } else {
    rows.push(row('SSL', '<span class="pill down">No certificate</span>'));
  }
  return rows.join('');
}

function dialogParts() {
  return {
    dialog: document.getElementById('detail') as HTMLDialogElement | null,
    title: document.getElementById('detail-title'),
    body: document.getElementById('detail-body'),
  };
}

async function openDetails(name: string, url: string): Promise<void> {
  const { dialog, title, body } = dialogParts();
  if (!dialog || !title || !body) return;
  title.textContent = name;
  body.innerHTML =
    '<div class="d-loading">Checking status &amp; certificate…</div>';
  dialog.showModal();
  try {
    const res = await fetch(
      `${SERVER_BASE}/status/probe?url=${encodeURIComponent(url)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) throw new Error(`Probe failed (${res.status})`);
    body.innerHTML = renderDetails((await res.json()) as ProbeResult);
  } catch (err) {
    body.innerHTML = `<div class="d-error">${escapeHtml(err instanceof Error ? err.message : 'Could not load details')}</div>`;
  }
}

export function runStatusPage(): void {
  document.querySelectorAll<HTMLButtonElement>('.info-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      void openDetails(btn.dataset.name ?? 'Service', btn.dataset.url ?? '');
    });
  });
  const { dialog } = dialogParts();
  document
    .getElementById('detail-close')
    ?.addEventListener('click', () => dialog?.close());
  dialog?.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close(); // backdrop click
  });
  void runBadges();
  setInterval(() => void runBadges(), REFRESH_MS);
}

/**
 * Client logic for the Duncit status page:
 *  - live reachability badges (opaque no-cors fetch, every 60s)
 *  - a Details dialog showing the real HTTP status code + TLS certificate
 *    (from the API's /status/probe) and, for services that expose one, a rich
 *    server health report (/health).
 */
const SERVER_BASE = import.meta.env.PROD ? 'https://server.duncit.com' : 'http://localhost:2001';
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
interface HealthReport {
  status: string;
  version: string;
  environment: string;
  node: string;
  platform: string;
  hostname: string;
  uptime: { processSeconds: number; systemSeconds: number };
  memory: { rssBytes: number; systemTotalBytes: number; systemFreeBytes: number };
  checks: { database: string };
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

function setDot(el: Element | null, state: 'ok' | 'down' | 'pending'): void {
  if (el) el.className = `dot dot-${state}`;
}

function setBadge(el: Element, ok: boolean): void {
  el.className = `badge badge-${ok ? 'ok' : 'down'}`;
  el.innerHTML = `<span class="dot dot-${ok ? 'ok' : 'down'}"></span><span class="label">${ok ? 'Operational' : 'Unreachable'}</span>`;
}

async function runBadges(): Promise<void> {
  // Only the service cards — `[data-card]` excludes the Details buttons, which
  // also carry a data-url (those were doubling the total before).
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-card]'));
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
  const text = document.getElementById('overall-text');
  const updated = document.getElementById('updated');
  let overall: 'ok' | 'down' | 'pending';
  if (up === total) overall = 'ok';
  else if (up === 0) overall = 'down';
  else overall = 'pending';
  setDot(document.getElementById('overall-dot'), overall);
  if (text)
    text.textContent = up === total ? 'All systems operational' : `${up} of ${total} services operational`;
  if (updated) updated.textContent = 'Last checked ' + new Date().toLocaleTimeString();
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

const fmtDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

function fmtBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** i;
  return `${parseFloat(value.toFixed(i === 0 || value >= 100 ? 0 : 1))} ${units[i]}`;
}

function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m && !d) parts.push(`${m}m`);
  return parts.join(' ') || '<1m';
}

const pill = (ok: boolean, text: string): string =>
  `<span class="pill ${ok ? 'pill-ok' : 'pill-down'}">${escapeHtml(text)}</span>`;

const row = (label: string, value: string): string =>
  `<div class="flex items-center justify-between gap-3 border-b border-line/60 py-2 text-sm last:border-0"><span class="font-semibold text-muted">${label}</span><span class="max-w-[62%] break-words text-right">${value}</span></div>`;

const section = (title: string, body: string): string =>
  `<section class="mb-4 last:mb-0"><h4 class="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">${title}</h4><div>${body}</div></section>`;

function renderProbe(r: ProbeResult): string {
  const code =
    r.statusCode !== null ? `${r.statusCode} ${r.statusText ?? ''}`.trim() : (r.error ?? 'Unreachable');
  const rows = [row('HTTP status', pill(r.ok, code))];
  const ssl = r.ssl;
  if (ssl) {
    const expiry =
      ssl.daysRemaining !== null
        ? `${fmtDate(ssl.validTo)} · ${ssl.daysRemaining} days left`
        : fmtDate(ssl.validTo);
    rows.push(
      row('SSL', pill(ssl.authorized, ssl.authorized ? 'Valid & trusted' : 'Not trusted')),
      row('Issuer', escapeHtml(ssl.issuer ?? '—')),
      row('Subject', escapeHtml(ssl.subject ?? '—')),
      row('Protocol', escapeHtml(ssl.protocol ?? '—')),
      row('Valid from', fmtDate(ssl.validFrom)),
      row('Expires', escapeHtml(expiry)),
    );
  } else {
    rows.push(row('SSL', '<span class="pill pill-down">No certificate</span>'));
  }
  return rows.join('');
}

function renderHealth(h: HealthReport): string {
  const used = h.memory.systemTotalBytes - h.memory.systemFreeBytes;
  const memPct = h.memory.systemTotalBytes > 0 ? Math.round((used / h.memory.systemTotalBytes) * 100) : 0;
  const rows = [
    row('Status', pill(h.status === 'ok', h.status)),
    row('Database', pill(h.checks.database === 'connected', h.checks.database)),
    row('Version', escapeHtml(h.version)),
    row('Environment', escapeHtml(h.environment)),
    row('Process uptime', fmtUptime(h.uptime.processSeconds)),
    row('System uptime', fmtUptime(h.uptime.systemSeconds)),
    row('Node', escapeHtml(h.node)),
    row('Platform', escapeHtml(h.platform)),
    row('Hostname', escapeHtml(h.hostname)),
  ];
  const mem = `<div class="pt-2.5"><div class="mb-1 flex justify-between text-sm"><span class="font-semibold text-muted">Memory</span><span>${fmtBytes(used)} / ${fmtBytes(h.memory.systemTotalBytes)}</span></div><div class="h-1.5 overflow-hidden rounded-full bg-line"><div class="h-full rounded-full bg-ok" style="width:${memPct}%"></div></div></div>`;
  return rows.join('') + mem;
}

function dialogParts() {
  return {
    dialog: document.getElementById('detail') as HTMLDialogElement | null,
    title: document.getElementById('detail-title'),
    dot: document.getElementById('detail-dot'),
    body: document.getElementById('detail-body'),
  };
}

async function fetchProbe(url: string): Promise<ProbeResult> {
  const res = await fetch(`${SERVER_BASE}/status/probe?url=${encodeURIComponent(url)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Probe failed (${res.status})`);
  return (await res.json()) as ProbeResult;
}

async function openDetails(name: string, url: string, healthUrl: string): Promise<void> {
  const { dialog, title, dot, body } = dialogParts();
  if (!dialog || !title || !body) return;
  title.textContent = name;
  setDot(dot, 'pending');
  body.innerHTML = '<div class="py-3 text-sm text-muted">Checking status &amp; certificate…</div>';
  dialog.showModal();
  try {
    const probe = await fetchProbe(url);
    setDot(dot, probe.ok ? 'ok' : 'down');
    let html = section('Endpoint', renderProbe(probe));
    if (healthUrl) {
      try {
        const res = await fetch(healthUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        html += section('Server health', renderHealth((await res.json()) as HealthReport));
      } catch {
        html += section('Server health', '<p class="py-1 text-sm text-muted">Health details unavailable.</p>');
      }
    }
    body.innerHTML = html;
  } catch (err) {
    setDot(dot, 'down');
    body.innerHTML = `<div class="py-3 text-sm font-bold text-down">${escapeHtml(err instanceof Error ? err.message : 'Could not load details')}</div>`;
  }
}

/** Pull the live brand (logo, name, accent) from admin settings so the status
 *  page reflects whatever branding is configured, not a hard-coded asset. */
async function loadBranding(): Promise<void> {
  try {
    const res = await fetch(`${SERVER_BASE}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ branding { app_name logo_url primary_color } }' }),
    });
    const branding = (await res.json())?.data?.branding as
      | { app_name?: string; logo_url?: string; primary_color?: string }
      | undefined;
    if (!branding) return;
    const logo = document.getElementById('brand-logo') as HTMLImageElement | null;
    if (logo && branding.logo_url) {
      logo.src = branding.logo_url;
      if (branding.app_name) logo.alt = branding.app_name;
    }
    if (branding.app_name) {
      const name = document.getElementById('brand-name');
      if (name) name.textContent = `${branding.app_name} Status`;
      document.title = `${branding.app_name} Status`;
    }
    if (branding.primary_color)
      document.documentElement.style.setProperty('--color-brand', branding.primary_color);
  } catch {
    /* keep the static fallback logo/name */
  }
}

export function runStatusPage(): void {
  void loadBranding();
  document.querySelectorAll<HTMLButtonElement>('button[data-name]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      void openDetails(btn.dataset.name ?? 'Service', btn.dataset.url ?? '', btn.dataset.health ?? '');
    });
  });
  const { dialog } = dialogParts();
  document.getElementById('detail-close')?.addEventListener('click', () => dialog?.close());
  dialog?.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close(); // backdrop click
  });
  void runBadges();
  setInterval(() => void runBadges(), REFRESH_MS);
}

#!/usr/bin/env node
// Wraps the parallel `pnpm dev` runner: forwards every child line straight
// through, watches for `localhost:<port>` ready signals from each workspace,
// and prints a clean project-URL table once all are up (or after a 20s
// fallback if a signal is missed). Pure Node, zero deps, Windows-safe.
import { spawn } from 'node:child_process';
import process from 'node:process';

const projects = [
  { label: 'website',                  port: 2000 },
  { label: 'server',                   port: 2001, path: '/graphql' },
  { label: 'admin',                    port: 2002 },
  { label: 'mweb-app',                 port: 2003 },
  { label: 'partners/partners-website', port: 2004 },
  { label: 'partners/partners-app',    port: 2005 },
  { label: 'ads-portal',               port: 2006 },
  { label: 'crm',                      port: 2007 },
  { label: 'finance',                  port: 2008 },
  { label: 'tech',                     port: 2009 },
  { label: 'support',                  port: 2010 },
  { label: 'website-app',              port: 2011 },
  { label: 'legal',                    port: 2012 },
  { label: 'ai',                       port: 2013 },
  { label: 'products',                 port: 2014 },
  { label: 'marketing',                port: 2015 },
  { label: 'onboarding',               port: 2016 },
  { label: 'hr',                       port: 2017 },
  { label: 'employee',                 port: 2018 },
  { label: 'status',                   port: 2019 },
  { label: 'ads-website',              port: 2020 },
  { label: 'earnwith-website',         port: 2025 },
  { label: 'challenge-portal',         port: 2026 },
  { label: 'developers-portal',        port: 2027 },
  // External: not a pnpm workspace, so `pnpm --recursive dev` doesn't start it.
  // Listed for reference; excluded from the "all ready" gate. Run via `pnpm dev:mobile`.
  { label: 'native (mobile web)',      port: 2022, external: true },
];

// Only workspace projects are launched by the parallel runner; externals are
// informational, so the ready-gate counts non-external projects only.
const expectedReady = projects.filter((p) => !p.external).length;

const urlOf = (p) => `http://localhost:${p.port}${p.path ?? '/'}`;

const ready = new Set();
let printed = false;

function printBanner() {
  if (printed) return;
  printed = true;
  const labelW = Math.max(...projects.map((p) => p.label.length), 'Project'.length);
  const urlW = Math.max(...projects.map((p) => urlOf(p).length), 'Local URL'.length);
  const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
  const sep = `+${'-'.repeat(labelW + 2)}+${'-'.repeat(urlW + 2)}+`;
  const out = [
    '',
    sep,
    `| ${pad('Project', labelW)} | ${pad('Local URL', urlW)} |`,
    sep,
    ...projects.map((p) => `| ${pad(p.label, labelW)} | ${pad(urlOf(p), urlW)} |`),
    sep,
    '',
  ].join('\n');
  process.stdout.write(`${out}\n`);
}

function detectReady(line) {
  const m = line.match(/localhost:(\d+)/);
  if (!m) return;
  const port = Number(m[1]);
  const proj = projects.find((p) => p.port === port);
  if (!proj || proj.external || ready.has(proj.port)) return;
  ready.add(proj.port);
  if (ready.size === expectedReady) setTimeout(printBanner, 250);
}

// Node 22+ on Windows refuses to spawn `.cmd`/`.bat` directly without a
// shell (CVE-2024-27980). Use `shell: true` so cmd.exe resolves `pnpm`.
const isWindows = process.platform === 'win32';
const child = spawn('pnpm', ['--parallel', '--recursive', '--if-present', 'dev'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: isWindows,
});

const wire = (src, dst) => {
  let buf = '';
  src.on('data', (chunk) => {
    const text = chunk.toString('utf8');
    dst.write(text);
    buf += text;
    let nl;
    // eslint-disable-next-line no-cond-assign
    while ((nl = buf.indexOf('\n')) !== -1) {
      detectReady(buf.slice(0, nl));
      buf = buf.slice(nl + 1);
    }
  });
};

wire(child.stdout, process.stdout);
wire(child.stderr, process.stderr);

// Fallback in case one project never logs a recognisable "localhost:" line.
setTimeout(printBanner, 20_000);

child.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));

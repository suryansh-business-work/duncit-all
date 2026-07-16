/**
 * Dump every open SonarQube issue for this project into one file.
 *
 *   pnpm sonar:issues                 # all open+confirmed issues
 *   pnpm sonar:issues --severity=HIGH # only HIGH impact
 *   pnpm sonar:issues --rule=S3776    # only one rule
 *   pnpm sonar:issues --out=foo.md    # custom path (.md or .json)
 *
 * Credentials come from the environment — never hard-code them (rule 35 / S2068):
 *   SONAR_HOST_URL  e.g. https://sonarqube.duncit.com
 *   SONAR_TOKEN     a user token  (or SONAR_LOGIN + SONAR_PASSWORD for basic auth)
 *
 * Writes <out>.json (raw issues) and <out>.md (grouped, readable). The scan
 * itself only runs on pushes to main (.github/workflows/sonar.yml) — this reads
 * whatever that last analysis produced, so merge to main (or run the workflow
 * manually) before trusting the numbers.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const PAGE_SIZE = 500;
// SonarQube refuses page * pageSize > 10000 on this endpoint.
const MAX_ISSUES = 10_000;

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);

const host = (process.env.SONAR_HOST_URL ?? '').replace(/\/$/, '');
const token = process.env.SONAR_TOKEN ?? '';
const login = process.env.SONAR_LOGIN ?? '';
const password = process.env.SONAR_PASSWORD ?? '';

if (!host) {
  console.error('SONAR_HOST_URL is not set. Example:\n  SONAR_HOST_URL=https://sonarqube.duncit.com SONAR_TOKEN=xxx pnpm sonar:issues');
  process.exit(1);
}
if (!token && !login) {
  console.error('Set SONAR_TOKEN (preferred) or SONAR_LOGIN + SONAR_PASSWORD.');
  process.exit(1);
}

/** Sonar tokens authenticate as the username with an empty password. */
const basic = Buffer.from(token ? `${token}:` : `${login}:${password}`).toString('base64');
const authHeader = { Authorization: `Basic ${basic}` };

/** Read the project key from sonar-project.properties so it cannot drift. */
async function projectKey() {
  const file = path.join(process.cwd(), 'sonar-project.properties');
  const text = await readFile(file, 'utf8');
  const match = /^sonar\.projectKey=(.+)$/m.exec(text);
  if (!match) throw new Error(`sonar.projectKey not found in ${file}`);
  return match[1].trim();
}

async function fetchPage(key, page) {
  const url = new URL(`${host}/api/issues/search`);
  url.searchParams.set('componentKeys', key);
  url.searchParams.set('issueStatuses', args.get('statuses') ?? 'OPEN,CONFIRMED');
  url.searchParams.set('ps', String(PAGE_SIZE));
  url.searchParams.set('p', String(page));
  if (args.get('severity')) url.searchParams.set('impactSeverities', args.get('severity').toUpperCase());
  if (args.get('rule')) {
    const rule = args.get('rule');
    url.searchParams.set('rules', rule.includes(':') ? rule : `typescript:${rule}`);
  }

  const res = await globalThis.fetch(url, { headers: authHeader });
  if (!res.ok) {
    throw new Error(`Sonar API ${res.status} ${res.statusText} — check SONAR_TOKEN / SONAR_HOST_URL`);
  }
  return res.json();
}

const key = await projectKey();
console.log(`Fetching issues for ${key} from ${host} …`);

const issues = [];
let total = 0;
for (let page = 1; ; page += 1) {
  const data = await fetchPage(key, page);
  total = data.total ?? 0;
  issues.push(...(data.issues ?? []));
  const fetched = page * PAGE_SIZE;
  if (issues.length >= total || fetched >= Math.min(total, MAX_ISSUES)) break;
}

const rows = issues.map((i) => ({
  rule: i.rule,
  severity: i.impacts?.[0]?.severity ?? i.severity ?? '-',
  file: (i.component ?? '').split(':').slice(1).join(':'),
  line: i.line ?? null,
  message: i.message ?? '',
  effort: i.effort ?? '',
}));

const tally = (pick) => {
  const counts = new Map();
  for (const r of rows) counts.set(pick(r), (counts.get(pick(r)) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

const outArg = args.get('out') ?? 'sonar-issues';
const base = outArg.replace(/\.(md|json)$/, '');
const bySeverity = tally((r) => r.severity);
const byRule = tally((r) => r.rule);
const byFile = tally((r) => r.file);

const severityFilter = args.get('severity') ? `, severity=${args.get('severity')}` : '';
const ruleFilter = args.get('rule') ? `, rule=${args.get('rule')}` : '';
const escapedPipe = String.raw`\|`;

const lines = [
  `# SonarQube open issues — ${key}`,
  '',
  `Fetched ${rows.length} of ${total} issue(s) from ${host}.`,
  `Filters: statuses=${args.get('statuses') ?? 'OPEN,CONFIRMED'}${severityFilter}${ruleFilter}`,
  '',
  '## By severity',
  '',
  ...bySeverity.map(([k, n]) => `- **${k}**: ${n}`),
  '',
  '## By rule',
  '',
  '| count | rule |',
  '| ----: | ---- |',
  ...byRule.map(([k, n]) => `| ${n} | ${k} |`),
  '',
  '## Top 40 files',
  '',
  '| count | file |',
  '| ----: | ---- |',
  ...byFile.slice(0, 40).map(([k, n]) => `| ${n} | ${k} |`),
  '',
  '## Every issue',
  '',
  '| severity | rule | file:line | message |',
  '| -------- | ---- | --------- | ------- |',
  ...rows.map((r) => `| ${r.severity} | ${r.rule} | ${r.file}:${r.line ?? '-'} | ${r.message.replaceAll('|', escapedPipe)} |`),
  '',
];

await writeFile(`${base}.json`, JSON.stringify({ project: key, total, issues: rows }, null, 2), 'utf8');
await writeFile(`${base}.md`, lines.join('\n'), 'utf8');

console.log(`\n  ${rows.length} issue(s) written to ${base}.json and ${base}.md\n`);
for (const [k, n] of bySeverity) console.log(`  ${k.padEnd(8)} ${n}`);
console.log('\n  top rules:');
for (const [k, n] of byRule.slice(0, 10)) console.log(`  ${String(n).padStart(5)}  ${k}`);

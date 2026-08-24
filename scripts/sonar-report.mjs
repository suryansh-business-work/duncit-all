#!/usr/bin/env node
/**
 * Read the quality gate back out of SonarQube, in CI, right after the scan.
 *
 * The scanner uploads a report and returns; the server then processes it as a
 * background task, and the gate only exists once that finishes. So a workflow
 * that stops at "scan step succeeded" has published a number nobody in the
 * pipeline can see — which is how a scan that was SKIPPED entirely
 * ("SonarQube went down after the probe") could still report a green job.
 *
 * This waits for that task, prints the gate and every condition, the coverage
 * measures, and the open issues grouped by rule — into the job log AND the run
 * summary — then writes the raw payloads as an artifact.
 *
 * Credentials come from the environment, never from source (rule 35 / S2068):
 *   SONAR_HOST_URL, SONAR_TOKEN
 *
 * Exit code is 0 unless FAIL_ON_GATE=true, so the report itself never becomes
 * the reason a run goes red.
 */
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const host = (process.env.SONAR_HOST_URL ?? '').replace(/\/$/, '');
const token = process.env.SONAR_TOKEN ?? '';
const failOnGate = process.env.FAIL_ON_GATE === 'true';
const TASK_TIMEOUT_MS = 15 * 60 * 1000;
const POLL_MS = 10_000;

if (!host || !token) {
  console.error('sonar-report: SONAR_HOST_URL and SONAR_TOKEN are required.');
  process.exit(1);
}

/** A Sonar token authenticates as the username with an empty password. */
const basic = Buffer.from(`${token}:`).toString('base64');
const auth = { Authorization: `Basic ${basic}` };

async function api(path) {
  const res = await fetch(`${host}${path}`, { headers: auth });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`);
  return res.json();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const lines = [];
const say = (line = '') => {
  console.log(line);
  lines.push(line);
};

/** The project key, from the same file the scanner is configured by. */
function configuredProjectKey() {
  const text = readFileSync('sonar-project.properties', 'utf8');
  const match = /^sonar\.projectKey=(.+)$/m.exec(text);
  if (!match) throw new Error('sonar.projectKey not found in sonar-project.properties');
  return match[1].trim();
}

/**
 * The scanner drops the task id here; without it there is nothing to wait on,
 * and the report falls back to whatever analysis the server last finished. That
 * fallback is worth having — a stale gate read is still a gate read — but it is
 * named as stale, because a number that describes the PREVIOUS commit is the
 * one thing worse than no number at all.
 */
function reportTask() {
  try {
    const text = readFileSync('.scannerwork/report-task.txt', 'utf8');
    const read = (key) => new RegExp(`^${key}=(.+)$`, 'm').exec(text)?.[1]?.trim();
    const ceTaskId = read('ceTaskId');
    if (ceTaskId) return { ceTaskId, projectKey: read('projectKey') ?? configuredProjectKey() };
  } catch {
    /* fall through to the stale read below */
  }
  return { ceTaskId: null, projectKey: configuredProjectKey() };
}

async function waitForAnalysis(ceTaskId) {
  const deadline = Date.now() + TASK_TIMEOUT_MS;
  let last = '';
  while (Date.now() < deadline) {
    const { task } = await api(`/api/ce/task?id=${encodeURIComponent(ceTaskId)}`);
    if (task.status !== last) {
      say(`compute engine task: ${task.status}`);
      last = task.status;
    }
    if (task.status === 'SUCCESS') return task.analysisId;
    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      throw new Error(`analysis ${task.status}: ${task.errorMessage ?? 'no message'}`);
    }
    await sleep(POLL_MS);
  }
  throw new Error('analysis did not finish inside the timeout');
}

/**
 * With no task of our own to follow, wait for the project to have none running.
 *
 * A gate read while a report is still being processed answers for the analysis
 * BEFORE it — the one thing worse than no number, because it looks current.
 */
async function waitForProjectIdle(projectKey) {
  const deadline = Date.now() + TASK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const body = await api(`/api/ce/component?component=${encodeURIComponent(projectKey)}`);
    const busy = (body.queue?.length ?? 0) > 0;
    if (!busy) return null;
    say(`compute engine: ${body.queue.length} task(s) still queued for this project`);
    await sleep(POLL_MS);
  }
  throw new Error('the project never went idle inside the timeout');
}

const MEASURES = [
  'alert_status',
  'coverage',
  'new_coverage',
  'lines_to_cover',
  'uncovered_lines',
  'new_lines_to_cover',
  'new_uncovered_lines',
  'duplicated_lines_density',
  'new_duplicated_lines_density',
  'violations',
  'new_violations',
  'blocker_violations',
  'critical_violations',
  'security_hotspots',
  'ncloc',
];

async function allIssues(projectKey) {
  const found = [];
  for (let page = 1; page <= 20; page += 1) {
    const query = new URLSearchParams({
      componentKeys: projectKey,
      resolved: 'false',
      ps: '500',
      p: String(page),
      s: 'SEVERITY',
      asc: 'false',
    });
    const body = await api(`/api/issues/search?${query}`);
    found.push(...body.issues);
    if (found.length >= body.paging.total || body.issues.length === 0) break;
    // Sonar refuses page * pageSize > 10000 on this endpoint.
    if (found.length >= 10_000) break;
  }
  return found;
}

const countBy = (rows, key) => {
  const out = new Map();
  for (const row of rows) out.set(key(row), (out.get(key(row)) ?? 0) + 1);
  return [...out.entries()].sort((a, b) => b[1] - a[1]);
};

const { ceTaskId, projectKey } = reportTask();
const analysisId = ceTaskId
  ? await waitForAnalysis(ceTaskId)
  : await waitForProjectIdle(projectKey);

const gateQuery = analysisId
  ? `analysisId=${encodeURIComponent(analysisId)}`
  : `projectKey=${encodeURIComponent(projectKey)}`;
const gate = await api(`/api/qualitygates/project_status?${gateQuery}`);
const measures = await api(
  `/api/measures/component?component=${encodeURIComponent(projectKey)}&metricKeys=${MEASURES.join(',')}`,
);
const issues = await allIssues(projectKey);

const status = gate.projectStatus?.status ?? 'UNKNOWN';
say('');
say(`## Quality gate: ${status}`);
say('');
for (const c of gate.projectStatus?.conditions ?? []) {
  const mark = c.status === 'OK' ? 'ok  ' : 'FAIL';
  say(`${mark} ${c.metricKey.padEnd(30)} ${String(c.actualValue).padStart(10)} (${c.comparator} ${c.errorThreshold})`);
}

say('');
say('## Measures');
say('');
const measured = new Map(
  (measures.component?.measures ?? []).map((m) => [m.metric, m.value ?? m.period?.value]),
);
for (const key of MEASURES) {
  if (measured.has(key)) say(`${key.padEnd(30)} ${measured.get(key)}`);
}

say('');
say(`## Open issues: ${issues.length}`);
say('');
for (const [severity, n] of countBy(issues, (i) => i.severity)) {
  say(`${String(n).padStart(6)}  ${severity}`);
}
say('');
say('top rules:');
for (const [rule, n] of countBy(issues, (i) => i.rule).slice(0, 25)) {
  say(`${String(n).padStart(6)}  ${rule}`);
}
say('');
say('top files:');
for (const [file, n] of countBy(issues, (i) => i.component.replace(`${projectKey}:`, '')).slice(0, 25)) {
  say(`${String(n).padStart(6)}  ${file}`);
}

writeFileSync('sonar-report.json', `${JSON.stringify({ gate, measures, issues }, null, 2)}\n`, 'utf8');
say('');
say(`raw payloads written to sonar-report.json (${issues.length} issue(s))`);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\`\`\`\n${lines.join('\n')}\n\`\`\`\n`, 'utf8');
}

if (status !== 'OK') {
  if (failOnGate) {
    console.error(`::error::SonarQube quality gate is ${status}.`);
    process.exit(1);
  }
  console.log(`::warning::SonarQube quality gate is ${status}.`);
}

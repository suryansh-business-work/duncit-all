#!/usr/bin/env node
/**
 * Posts the "AI cost" comment on a pull request: for each commit of a push,
 * the LLM, the editor, the input / output tokens and the estimated cost of the
 * Claude Code work that produced it. Run it right after every push.
 *
 *   node scripts/ai-cost-report.mjs                 # PR of the current branch
 *   node scripts/ai-cost-report.mjs --pr 478        # a specific PR
 *   node scripts/ai-cost-report.mjs --dry-run       # print the comment, post nothing
 *   node scripts/ai-cost-report.mjs --max-commits 10   # only the newest 10 (default: every new commit)
 *
 * A comment covers the commits after the newest one an earlier AI-cost comment
 * already reported, so running it twice posts nothing new, and the first run on
 * a PR reports its whole history. Needs `git` and an authenticated `gh`.
 * The measuring and pricing live in scripts/lib/ai-cost.mjs.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { MARKER, attribute, buildWindows, collectMessages, loadPricing, parseReported, renderComment } from './lib/ai-cost.mjs';

const MAX_COMMENT_CHARS = 60000; // GitHub rejects a comment above 65,536
const SEP = '\u001f';

function run(cmd, args, input) {
  return execFileSync(cmd, args, { encoding: 'utf8', input, maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
}

function parseArgs(argv) {
  const args = { pr: null, dryRun: false, maxCommits: Infinity, projectsDir: path.join(os.homedir(), '.claude', 'projects') };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--dry-run') args.dryRun = true;
    else if (flag === '--pr') args.pr = argv[++i];
    else if (flag === '--max-commits') args.maxCommits = Number(argv[++i]);
    else if (flag === '--projects-dir') args.projectsDir = argv[++i];
    else throw new Error(`Unknown option ${flag}`);
  }
  if (args.pr !== null && !/^\d+$/.test(args.pr)) throw new Error('--pr takes a pull request number');
  if (args.maxCommits !== Infinity && (!Number.isInteger(args.maxCommits) || args.maxCommits < 1)) {
    throw new Error('--max-commits takes a positive whole number');
  }
  return args;
}

/** Claude Code names a project's transcript folder after its path, every non-alphanumeric turned into "-". */
const slug = (dir) => dir.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

/** Transcript folders for this checkout and every worktree of it (a session can run in either). */
function transcriptDirs(projectsDir) {
  const roots = new Set(
    run('git', ['worktree', 'list', '--porcelain'])
      .split('\n')
      .filter((line) => line.startsWith('worktree '))
      .map((line) => slug(line.slice('worktree '.length))),
  );
  const top = slug(run('git', ['rev-parse', '--show-toplevel']).trim());
  return fs
    .readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => {
      const name = entry.name.toLowerCase();
      return roots.has(name) || name.startsWith(`${top}-`);
    })
    .map((entry) => path.join(projectsDir, entry.name));
}

/** Every transcript (subagent ones included) touched since `sinceMs`, merged per message id. */
function readMessages(dirs, sinceMs) {
  const messages = new Map();
  for (const dir of dirs) {
    for (const rel of fs.readdirSync(dir, { recursive: true })) {
      const file = path.join(dir, String(rel));
      if (!file.endsWith('.jsonl') || fs.statSync(file).mtimeMs < sinceMs) continue;
      collectMessages(fs.readFileSync(file, 'utf8'), messages);
    }
  }
  return [...messages.values()];
}

function pullRequest(number) {
  const args = ['pr', 'view', ...(number ? [number] : []), '--json', 'number,baseRefName,headRefOid'];
  return JSON.parse(run('gh', args));
}

function reportedBodies(number) {
  const out = run('gh', [
    'api',
    `repos/{owner}/{repo}/issues/${number}/comments`,
    '--paginate',
    '--jq',
    `.[] | select(.body | contains("${MARKER}")) | .body | @json`,
  ]);
  return out.split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

function prCommits(base, head) {
  const log = run('git', ['log', '--reverse', `--format=%H${SEP}%ct${SEP}%s`, `${base}..${head}`]);
  return log
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [sha, seconds, ...subject] = line.split(SEP);
      return { sha, committedMs: Number(seconds) * 1000, subject: subject.join(SEP) };
    });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const pr = pullRequest(args.pr);
  const commits = prCommits(`origin/${pr.baseRefName}`, pr.headRefOid);
  if (commits.length === 0) return console.log(`PR #${pr.number} has no commits ahead of ${pr.baseRefName}.`);

  const reported = parseReported(reportedBodies(pr.number));
  const parentMs = Number(run('git', ['log', '-1', '--format=%ct', `${commits[0].sha}^`]).trim()) * 1000;
  const windows = buildWindows(commits, parentMs);
  // A push adds commits on top, so what is new is everything after the newest commit already reported.
  const lastReported = commits.findLastIndex((commit) => reported.has(commit.sha));
  const pending = commits.slice(lastReported + 1);
  if (pending.length === 0) return console.log(`PR #${pr.number}: every commit already has an AI-cost report.`);

  const pricing = loadPricing();
  const records = readMessages(transcriptDirs(args.projectsDir), windows[0].startMs);
  const totals = attribute(records, windows, pricing);
  const priorUsd = [...reported.values()].reduce((sum, usd) => sum + usd, 0);
  const render = (shown) =>
    renderComment({
      rows: shown.map((commit) => ({ sha: commit.sha, subject: commit.subject, totals: totals.get(commit.sha) })),
      priorUsd,
      pricing,
      skippedOlder: pending.length - shown.length,
    });

  let shown = pending.slice(-args.maxCommits);
  let body = render(shown);
  while (body.length > MAX_COMMENT_CHARS && shown.length > 1) {
    shown = shown.slice(Math.max(1, Math.ceil(shown.length / 10))); // drop the oldest tenth, say so in the comment
    body = render(shown);
  }

  if (args.dryRun) return console.log(body);
  run('gh', ['pr', 'comment', String(pr.number), '--body-file', '-'], body);
  console.log(`Posted the AI-cost comment on PR #${pr.number} (${shown.length} commit${shown.length === 1 ? '' : 's'}).`);
}

try {
  main();
} catch (error) {
  console.error(`ai-cost-report failed: ${error.stderr?.toString().trim() || error.message}`);
  process.exitCode = 1;
}

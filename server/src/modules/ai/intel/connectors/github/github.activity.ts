import type { SyncContext } from '../intel.driver';
import { gh, type RepoConfig } from './github.api';

/**
 * Issues, pull requests and commits for one repository. Incremental runs ask
 * only for what changed since the last run (`since`); full runs read the most
 * recent items up to a cap, so a very old repository does not cost a fortune.
 */

const MAX_PAGES = 5;

interface Issue {
  number: number;
  title: string;
  body?: string | null;
  state: string;
  html_url: string;
  updated_at: string;
  user?: { login?: string };
  labels?: Array<{ name?: string } | string>;
  pull_request?: unknown;
}

interface Commit {
  sha: string;
  html_url: string;
  commit: { message: string; author?: { name?: string; date?: string } };
}

const labelNames = (labels: Issue['labels']) => (labels ?? []).map((l) => (typeof l === 'string' ? l : (l.name ?? ''))).filter(Boolean);

async function issues(ctx: SyncContext, r: RepoConfig, since: string | undefined): Promise<number> {
  let count = 0;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const qs = new URLSearchParams({ state: 'all', sort: 'updated', direction: 'desc', per_page: '100', page: String(page), ...(since ? { since } : {}) });
    const rows = await gh<Issue[]>(ctx.entry, `/repos/${r.owner}/${r.repo}/issues?${qs}`);
    for (const i of rows) {
      const isPr = Boolean(i.pull_request);
      if ((isPr && !r.prs) || (!isPr && !r.issues)) continue;
      const kind = isPr ? 'Pull request' : 'Issue';
      const text = `${kind} #${i.number} (${i.state}) by ${i.user?.login ?? 'unknown'}\nLabels: ${labelNames(i.labels).join(', ') || 'none'}\n\n${i.body ?? ''}`;
      const ok = await ctx.emit({ external_id: `${r.owner}/${r.repo}:${isPr ? 'pr' : 'issue'}:${i.number}`, title: `${r.owner}/${r.repo} ${kind.toLowerCase()} #${i.number}: ${i.title}`, url: i.html_url, text, metadata: { repo: `${r.owner}/${r.repo}`, number: i.number, state: i.state }, updated_at: new Date(i.updated_at) });
      if (!ok) return count;
      count += 1;
    }
    if (rows.length < 100) break;
  }
  return count;
}

async function commits(ctx: SyncContext, r: RepoConfig, since: string | undefined): Promise<number> {
  let count = 0;
  for (let page = 1; page <= 3; page += 1) {
    const qs = new URLSearchParams({ sha: r.branch, per_page: '100', page: String(page), ...(since ? { since } : {}) });
    const rows = await gh<Commit[]>(ctx.entry, `/repos/${r.owner}/${r.repo}/commits?${qs}`);
    for (const c of rows) {
      const date = c.commit.author?.date ?? new Date().toISOString();
      const ok = await ctx.emit({ external_id: `${r.owner}/${r.repo}:commit:${c.sha}`, title: `${r.owner}/${r.repo} commit ${c.sha.slice(0, 9)}: ${c.commit.message.split('\n')[0]?.slice(0, 100) ?? ''}`, url: c.html_url, text: `Commit ${c.sha} on ${r.branch} by ${c.commit.author?.name ?? 'unknown'} at ${date}\n\n${c.commit.message}`, metadata: { repo: `${r.owner}/${r.repo}`, sha: c.sha }, updated_at: new Date(date) });
      if (!ok) return count;
      count += 1;
    }
    if (rows.length < 100) break;
  }
  return count;
}

export async function syncActivity(ctx: SyncContext, r: RepoConfig): Promise<void> {
  const key = `${r.owner}/${r.repo}`;
  const marks = (ctx.cursor.activity as Record<string, string> | undefined) ?? {};
  const since = ctx.mode === 'INCREMENTAL' ? marks[key] : undefined;
  const startedAt = new Date().toISOString();
  const issueCount = r.issues || r.prs ? await issues(ctx, r, since) : 0;
  const commitCount = r.commits ? await commits(ctx, r, since) : 0;
  marks[key] = startedAt;
  ctx.cursor.activity = marks;
  ctx.log(`${key}: ${issueCount} issue(s)/PR(s), ${commitCount} commit(s)`);
}

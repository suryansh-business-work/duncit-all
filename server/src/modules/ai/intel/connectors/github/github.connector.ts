import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { INTEL_LIMITS } from '../../intel.constants';
import type { ResolvedEntry } from '../intel.credentials';
import type { ConnectorDriver, SyncContext, TestResult } from '../intel.driver';
import { ProviderError } from '../intel.http';
import { gh, ghHeaders, GITHUB_API as API, repoKey, type RepoConfig } from './github.api';
import { fileKind, looksBinary, stripRoot } from './github.files';
import { syncActivity } from './github.activity';
import { TarReader, type TarEntry } from './tar.stream';

/**
 * GitHub: a token from the chosen Tech portal GITHUB entry. A full sync reads
 * each repository's branch as ONE tarball (streamed, so a big repo never sits
 * in memory); an incremental sync asks the compare API which files changed
 * since the last indexed commit and re-reads only those. Issues, pull requests
 * and commits are in github.activity.ts.
 */

export async function listBranches(entry: ResolvedEntry, owner: string, repo: string): Promise<string[]> {
  const rows = await gh<Array<{ name: string }>>(entry, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`);
  return rows.map((r) => r.name);
}

export interface RepoOption {
  owner: string;
  name: string;
  default_branch: string;
}

/** At most this many pages of 100 — enough for any account Intel indexes, bounded for a form picker. */
const MAX_REPO_PAGES = 5;

/**
 * Every repository the token can read (its own, collaborations and its
 * organisations'), most recently pushed first. Works for classic and
 * fine-grained tokens alike, so the owners offered are exactly those the
 * token reaches.
 */
export async function listRepos(entry: ResolvedEntry): Promise<RepoOption[]> {
  const out: RepoOption[] = [];
  for (let page = 1; page <= MAX_REPO_PAGES; page += 1) {
    const rows = await gh<Array<{ name: string; owner: { login: string }; default_branch?: string }>>(entry, `/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member&page=${page}`);
    out.push(...rows.map((r) => ({ owner: r.owner.login, name: r.name, default_branch: r.default_branch ?? 'main' })));
    if (rows.length < 100) break;
  }
  return out;
}

const blobUrl = (r: RepoConfig, path: string) => `https://github.com/${r.owner}/${r.repo}/blob/${encodeURIComponent(r.branch)}/${path}`;

async function emitFile(ctx: SyncContext, r: RepoConfig, path: string, data: Buffer): Promise<boolean> {
  const kind = fileKind(path);
  if (!kind || (kind === 'code' && !r.code) || (kind === 'doc' && !r.docs) || looksBinary(data)) return true;
  return ctx.emit({ external_id: `${repoKey(r)}:${path}`, title: `${repoKey(r)}/${path}`, url: blobUrl(r, path), text: data.toString('utf8'), code: kind === 'code', metadata: { repo: repoKey(r), path, branch: r.branch } });
}

async function fullFiles(ctx: SyncContext, r: RepoConfig): Promise<number> {
  const res = await fetch(`${API}/repos/${r.owner}/${r.repo}/tarball/${encodeURIComponent(r.branch)}`, { headers: ghHeaders(ctx.entry), redirect: 'follow', signal: AbortSignal.timeout(10 * 60_000) });
  if (!res.ok || !res.body) throw new ProviderError(`Could not download ${repoKey(r)}@${r.branch} (HTTP ${res.status})`, res.status);
  const queue: TarEntry[] = [];
  const reader = new TarReader(INTEL_LIMITS.maxIndexedFileBytes, (e) => queue.push(e));
  const gunzip = Readable.fromWeb(res.body as never).pipe(createGunzip());
  let files = 0;
  for await (const chunk of gunzip) {
    reader.push(chunk as Buffer);
    while (queue.length) {
      const entry = queue.shift();
      if (!entry) break;
      if (!(await emitFile(ctx, r, stripRoot(entry.path), entry.data))) {
        gunzip.destroy();
        return files;
      }
      files += 1;
    }
  }
  return files;
}

async function changedFiles(ctx: SyncContext, r: RepoConfig, base: string, head: string): Promise<number | null> {
  const diff = await gh<{ files?: Array<{ filename: string; status: string; previous_filename?: string }> }>(ctx.entry, `/repos/${r.owner}/${r.repo}/compare/${base}...${head}`);
  const files = diff.files ?? [];
  if (files.length >= 300) return null; // the compare API truncates — fall back to a full read
  for (const f of files) {
    if (f.previous_filename) await ctx.remove(`${repoKey(r)}:${f.previous_filename}`);
    if (f.status === 'removed') {
      await ctx.remove(`${repoKey(r)}:${f.filename}`);
      continue;
    }
    if (!fileKind(f.filename)) continue;
    const content = await gh<{ content?: string; size?: number }>(ctx.entry, `/repos/${r.owner}/${r.repo}/contents/${f.filename.split('/').map(encodeURIComponent).join('/')}?ref=${head}`).catch(() => null);
    if (!content?.content || (content.size ?? 0) > INTEL_LIMITS.maxIndexedFileBytes) continue;
    if (!(await emitFile(ctx, r, f.filename, Buffer.from(content.content, 'base64')))) break;
  }
  return files.length;
}

export const githubDriver: ConnectorDriver = {
  async test(connector, entry): Promise<TestResult> {
    try {
      const user = await gh<{ login?: string }>(entry, '/user').catch(() => ({ login: undefined }));
      const repos = (connector.config.repos as RepoConfig[] | undefined) ?? [];
      const details: string[] = [];
      let ok = true;
      for (const r of repos) {
        const reachable = await gh(entry, `/repos/${r.owner}/${r.repo}/branches/${encodeURIComponent(r.branch)}`).then(() => true).catch(() => false);
        ok &&= reachable;
        details.push(`${repoKey(r)}@${r.branch}: ${reachable ? 'reachable' : 'not reachable'}`);
      }
      const who = user.login ? ' as ' + user.login : '';
      return { ok, message: ok ? `Connected${who}.` : 'Some repositories or branches could not be reached.', details };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Connection failed', details: [] };
    }
  },

  async sync(ctx: SyncContext) {
    const shas = (ctx.cursor.shas as Record<string, string> | undefined) ?? {};
    for (const r of (ctx.connector.config.repos as RepoConfig[] | undefined) ?? []) {
      const head = (await gh<{ sha: string }>(ctx.entry, `/repos/${r.owner}/${r.repo}/commits/${encodeURIComponent(r.branch)}`)).sha;
      if (r.code || r.docs) {
        const base = shas[repoKey(r)];
        let changed: number | null = null;
        if (ctx.mode === 'INCREMENTAL' && base && base !== head) changed = await changedFiles(ctx, r, base, head);
        if (ctx.mode === 'INCREMENTAL' && base === head) changed = 0;
        if (changed === null) changed = await fullFiles(ctx, r);
        ctx.log(`${repoKey(r)}@${r.branch}: ${changed} file(s) read`);
      }
      await syncActivity(ctx, r);
      shas[repoKey(r)] = head;
    }
    ctx.cursor.shas = shas;
  },
};

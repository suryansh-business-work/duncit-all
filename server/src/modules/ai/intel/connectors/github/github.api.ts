import type { ResolvedEntry } from '../intel.credentials';
import { fetchJson, ProviderError } from '../intel.http';

/** GitHub REST access shared by the file and activity syncs. */

export const GITHUB_API = 'https://api.github.com';

export interface RepoConfig {
  owner: string;
  repo: string;
  branch: string;
  code: boolean;
  docs: boolean;
  issues: boolean;
  prs: boolean;
  commits: boolean;
}

export const ghHeaders = (entry: ResolvedEntry): Record<string, string> => {
  if (!entry.config.token) throw new ProviderError(`The Tech portal entry "${entry.name}" has no access token.`, 0);
  return { Authorization: `Bearer ${entry.config.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'duncit-intel' };
};

export const gh = <T>(entry: ResolvedEntry, path: string) => fetchJson<T>(`${GITHUB_API}${path}`, { headers: ghHeaders(entry) });

export const repoKey = (r: Pick<RepoConfig, 'owner' | 'repo'>) => `${r.owner}/${r.repo}`;

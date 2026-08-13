import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import type { AppBuildPlatform } from './appBuild.model';

/**
 * Starting a GitHub Actions workflow from the portal.
 *
 * This is the only outbound WRITE in App Builds. Everything else in the feature
 * records what CI already did; this makes CI do something, which is why the
 * credential is a separate env category and the resolver gates it on the same
 * roles as the rest of the module.
 *
 * Deliberately small: one dispatch call and the links around it. No run polling
 * — a dispatch answers 204 with no run id, and rather than hunting for the run
 * it just created (which is a guess against a list, and wrong whenever two
 * builds start together), the workflow tells us who it is on its first report.
 */

const GITHUB_API = 'https://api.github.com';

/** GitHub gets no longer than this to accept a dispatch. */
const TIMEOUT_MS = 15_000;

/** Which workflow file builds each platform. */
export const WORKFLOW_FILE: Record<AppBuildPlatform, string> = {
  ANDROID: 'android-build.yml',
  IOS: 'ios-build.yml',
};

export interface GithubRepoConfig {
  token: string;
  owner: string;
  repo: string;
}

const configError = () =>
  new GraphQLError(
    'GitHub is not configured. Add an access token, owner and repository in Environment Variables → GitHub.',
    { extensions: { code: 'BAD_REQUEST' } }
  );

/** The configured repo, or null when any part of it is missing. */
export async function githubRepoConfig(): Promise<GithubRepoConfig | null> {
  const [token, owner, repo] = await Promise.all([
    getRuntimeEnvValue('GITHUB_TOKEN'),
    getRuntimeEnvValue('GITHUB_OWNER'),
    getRuntimeEnvValue('GITHUB_REPO'),
  ]);
  const cfg = {
    token: String(token ?? '').trim(),
    owner: String(owner ?? '').trim(),
    repo: String(repo ?? '').trim(),
  };
  if (!cfg.token || !cfg.owner || !cfg.repo) return null;
  return cfg;
}

/** The configured repo, or a thrown error naming where to configure it. */
export async function requireGithubRepoConfig(): Promise<GithubRepoConfig> {
  const cfg = await githubRepoConfig();
  if (!cfg) throw configError();
  return cfg;
}

/** Where a workflow's runs are listed, filtered to one branch. */
export function workflowRunsUrl(cfg: GithubRepoConfig, workflowFile: string, ref: string): string {
  const query = new URLSearchParams({ query: `branch:${ref}` });
  return `https://github.com/${cfg.owner}/${cfg.repo}/actions/workflows/${workflowFile}?${query}`;
}

/**
 * What GitHub said, in words an operator can act on.
 *
 * The two failures that actually happen both answer with a status that reads
 * like something else: 404 is "the token cannot see this repo" far more often
 * than a missing workflow file, and 422 is almost always a ref whose copy of
 * the workflow does not declare the inputs being sent — which is what a
 * not-yet-merged workflow change looks like from here.
 */
function dispatchFailure(status: number, message: string, ref: string, workflowFile: string): GraphQLError {
  if (status === 404) {
    return new GraphQLError(
      `GitHub could not find ${workflowFile}, or the token cannot see the repository. Check the token has Actions: Read and write on it.`,
      { extensions: { code: 'BAD_GATEWAY', github_status: status } }
    );
  }
  if (status === 422) {
    return new GraphQLError(
      `GitHub refused the build: ${message} — usually the branch "${ref}" does not have a copy of ${workflowFile} that accepts these inputs. Merge the workflow change into that branch first.`,
      { extensions: { code: 'BAD_GATEWAY', github_status: status } }
    );
  }
  return new GraphQLError(`GitHub refused the build (HTTP ${status}): ${message}`, {
    extensions: { code: 'BAD_GATEWAY', github_status: status },
  });
}

/**
 * Ask GitHub to run a workflow. Resolves only when GitHub has ACCEPTED it
 * (204); every other answer throws, so a queued row is never written for a
 * build that was refused.
 */
export async function dispatchWorkflow(
  cfg: GithubRepoConfig,
  workflowFile: string,
  ref: string,
  inputs: Record<string, string>
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${GITHUB_API}/repos/${cfg.owner}/${cfg.repo}/actions/workflows/${workflowFile}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref, inputs }),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
      throw new GraphQLError(`GitHub did not answer within ${TIMEOUT_MS / 1000}s — the build was not started.`, {
        extensions: { code: 'BAD_GATEWAY' },
      });
    }
    throw new GraphQLError(`Could not reach GitHub: ${String(err?.message ?? err)}`, {
      extensions: { code: 'BAD_GATEWAY' },
    });
  } finally {
    clearTimeout(timer);
  }

  // 204 No Content is the ONLY success. A dispatch carries no body to read, so
  // anything else is a refusal whose reason is in the error payload.
  if (res.status === 204) return;
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  throw dispatchFailure(res.status, String(body.message ?? 'no reason given'), ref, workflowFile);
}

import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { outboundFetch } from '@utils/outboundFetch';

/**
 * Reading SonarQube from the server — the Analytics console's Security and
 * Unit Test Coverage pages, and the SonarQube connection test in Tech.
 *
 * The instance forces authentication, so every call carries the token saved in
 * Tech → Environment Variables → SonarQube. A user token with Browse on the
 * project is enough: nothing here writes. The CI scan keeps its own
 * SONAR_TOKEN secret, which belongs to the workflow and never reaches the API.
 */

/** SonarQube gets no longer than this to answer one call. */
const TIMEOUT_MS = 15_000;

export interface SonarConfig {
  hostUrl: string;
  token: string;
  projectKey: string;
}

/** One measure as the Web API returns it; `new_*` metrics answer on `period`. */
export interface SonarMeasure {
  metric: string;
  value?: string;
  period?: { value?: string };
}

export type SonarParams = Record<string, string | number>;

/** The configured project, or null when any part of it is missing. */
export async function sonarConfig(): Promise<SonarConfig | null> {
  const [hostUrl, token, projectKey] = await Promise.all([
    getRuntimeEnvValue('SONAR_HOST_URL'),
    getRuntimeEnvValue('SONAR_TOKEN'),
    getRuntimeEnvValue('SONAR_PROJECT_KEY'),
  ]);
  const cfg = { hostUrl: hostUrl.trim(), token: token.trim(), projectKey: projectKey.trim() };
  if (!cfg.hostUrl || !cfg.token || !cfg.projectKey) return null;
  return cfg;
}

/** The configured project, or a thrown error naming where to configure it. */
export async function requireSonarConfig(): Promise<SonarConfig> {
  const cfg = await sonarConfig();
  if (!cfg) {
    throw new GraphQLError(
      'SonarQube is not connected. Add its URL, a token and the project key in Tech → Environment Variables → SonarQube.',
      { extensions: { code: 'BAD_REQUEST' } }
    );
  }
  return cfg;
}

/** What a refusal means, in words an operator can act on. */
function refusal(status: number, projectKey: string): string {
  if (status === 401) {
    return 'SonarQube refused the token. Generate a new one and save it in Tech → Environment Variables → SonarQube.';
  }
  if (status === 403) return `The SonarQube token cannot browse ${projectKey}. Give its user Browse permission on the project.`;
  if (status === 404) return `SonarQube could not find what was asked for in ${projectKey}. Check the project key in Tech → Environment Variables → SonarQube.`;
  return `SonarQube answered HTTP ${status}.`;
}

/** SonarQube's own reason, from the `{ errors: [{ msg }] }` body it sends with a refusal. */
async function sonarReason(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { errors?: Array<{ msg?: string }> };
    return body.errors?.[0]?.msg ?? null;
  } catch {
    // A 401 arrives with no body at all; the status says enough.
    return null;
  }
}

/** One GET on the SonarQube Web API. A refusal throws; a transport failure throws in plain words. */
export async function sonarGet<T>(cfg: SonarConfig, path: string, params: SonarParams): Promise<T> {
  const url = new URL(path, cfg.hostUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const res = await outboundFetch('SonarQube', url.toString(), {
    headers: { authorization: `Bearer ${cfg.token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const reason = await sonarReason(res);
    const message = refusal(res.status, cfg.projectKey);
    throw new GraphQLError(reason ? `${message} SonarQube said: ${reason}` : message, {
      extensions: { code: 'BAD_GATEWAY', sonar_status: res.status },
    });
  }
  return (await res.json()) as T;
}

/** A page of this project in SonarQube's own UI — where a reader goes for "more details". */
export function sonarPageUrl(cfg: SonarConfig, path: string, params: SonarParams = {}): string {
  const url = new URL(path, cfg.hostUrl);
  url.searchParams.set('id', cfg.projectKey);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  return url.toString();
}

/** Measures as numbers by metric. A metric SonarQube has no value for is simply absent. */
export function measureMap(measures: readonly SonarMeasure[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const measure of measures) {
    const raw = measure.value ?? measure.period?.value;
    if (raw !== undefined) out.set(measure.metric, Number(raw));
  }
  return out;
}

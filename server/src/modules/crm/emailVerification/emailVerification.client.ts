import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { outboundFetch } from '@utils/outboundFetch';
import type { EmailVerificationStatus } from './emailVerification.model';

/**
 * The self-hosted Reacher backend (github.com/reacherhq/check-if-email-exists),
 * running as the `reacher` container beside the server. It has no host port,
 * so `REACHER_INTERNAL_URL` is a Docker-network address. `REACHER_HEADER_SECRET`
 * is optional and, when set, must match the container's RCH__HEADER_SECRET.
 */
const SERVICE = 'Email verifier';
/** Above the container's RCH__SMTP_TIMEOUT so Reacher answers "unknown" before we give up. */
const TIMEOUT_MS = 60_000;

const REACHABLE_TO_STATUS: Readonly<Record<string, EmailVerificationStatus>> = {
  safe: 'VERIFIED',
  risky: 'RISKY',
  invalid: 'INVALID',
  unknown: 'UNKNOWN',
};

/** What we keep from Reacher's answer — the fields the CRM shows and filters on. */
export interface EmailCheckResult {
  status: EmailVerificationStatus;
  is_valid_syntax: boolean;
  accepts_mail: boolean;
  can_connect_smtp: boolean;
  is_deliverable: boolean;
  is_catch_all: boolean;
  has_full_inbox: boolean;
  is_disabled: boolean;
  is_disposable: boolean;
  is_role_account: boolean;
  suggestion: string;
}

type Section = Record<string, unknown> | undefined;

/** Reacher replaces a section with `{ type, message }` when that step errored — read only booleans. */
const flag = (section: Section, key: string): boolean => section?.[key] === true;

const sectionOf = (body: Record<string, unknown>, key: string): Section => {
  const value = body[key];
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
};

/** Map Reacher's JSON onto the record we store. Exported for its unit tests. */
export function toCheckResult(body: Record<string, unknown>): EmailCheckResult {
  const syntax = sectionOf(body, 'syntax');
  const mx = sectionOf(body, 'mx');
  const smtp = sectionOf(body, 'smtp');
  const misc = sectionOf(body, 'misc');
  const suggestion = syntax?.suggestion;
  return {
    status: REACHABLE_TO_STATUS[String(body.is_reachable)] ?? 'UNKNOWN',
    is_valid_syntax: flag(syntax, 'is_valid_syntax'),
    accepts_mail: flag(mx, 'accepts_mail'),
    can_connect_smtp: flag(smtp, 'can_connect_smtp'),
    is_deliverable: flag(smtp, 'is_deliverable'),
    is_catch_all: flag(smtp, 'is_catch_all'),
    has_full_inbox: flag(smtp, 'has_full_inbox'),
    is_disabled: flag(smtp, 'is_disabled'),
    is_disposable: flag(misc, 'is_disposable'),
    is_role_account: flag(misc, 'is_role_account'),
    suggestion: typeof suggestion === 'string' ? suggestion : '',
  };
}

/** Ask Reacher about one address. Throws BAD_GATEWAY when the verifier itself is down. */
export async function checkEmailWithReacher(email: string): Promise<EmailCheckResult> {
  const baseUrl = (await getRuntimeEnvValue('REACHER_INTERNAL_URL')).replace(/\/+$/, '');
  if (!baseUrl) {
    throw new GraphQLError(`${SERVICE} is not configured (REACHER_INTERNAL_URL is missing)`, {
      extensions: { code: 'BAD_GATEWAY', service: SERVICE },
    });
  }
  const secret = await getRuntimeEnvValue('REACHER_HEADER_SECRET');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) headers['x-reacher-secret'] = secret;

  const res = await outboundFetch(SERVICE, `${baseUrl}/v0/check_email`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ to_email: email }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    throw new GraphQLError(`${SERVICE} answered ${res.status}${detail ? `: ${detail}` : ''}`, {
      extensions: { code: 'BAD_GATEWAY', service: SERVICE },
    });
  }
  return toCheckResult((await res.json()) as Record<string, unknown>);
}

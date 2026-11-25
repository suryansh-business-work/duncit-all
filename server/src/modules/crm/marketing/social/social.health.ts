import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { UserModel } from '@modules/access/user/user.model';
import { sendHtmlEmail } from '@services/email/email.service';
import { SocialAccountModel } from './social.model';
import { READERS } from './providers';
import { SocialApiError } from './providers/http';
import { usesFacebookGraph } from './providers/instagram';
import { debugToken } from './providers/meta.login';
import { socialCredentials } from './social.credentials';
import { SOCIAL_SETTINGS_DEFAULTS, loadSocialSettings } from './social.settings';
import { freshHandle, type AccountWithTokens } from './social.sync';
import type { SocialAccountStatus, SocialAppCredentials, SocialPlatform } from './social.types';
import { DM_PERMISSION, missingDmPermission } from './social.window';

/**
 * The daily health check behind Marketing → Social Accounts.
 *
 * A sync reads posts and comments and spends quota; a health check reads only
 * the profile, which is the cheapest call every network has, and asks one
 * question: does this token still work? The answer lands on the account row
 * (health_ok, health_message, health_checked_at), a dead token flips the
 * account to EXPIRED the way a failed sync would, and the owner is emailed
 * when the token is within the Settings' reminder window (a week by default) — before the account goes quiet,
 * not after. For a Facebook Login token it also asks Meta about the token
 * itself (debug_token): a revoked token is caught even while the profile still
 * reads, and the permissions and expiry Meta reports are kept on the row, so an
 * account without the messaging permission is flagged. Instagram and Threads
 * tokens are renewed by the fresh handle a week before they lapse.
 */
const DAY_MS = 86_400_000;
/** Accounts whose token lapses within this many days are worth a reminder, until Settings says otherwise (expiry_alert_days). */
export const EXPIRY_ALERT_DAYS = SOCIAL_SETTINGS_DEFAULTS.expiry_alert_days;
/** How many accounts one pass checks; the pass runs daily, so this is a ceiling, not a budget. */
const CHECK_LIMIT = 200;
const NOT_CONFIGURED = 'This network’s app is not set up yet — add it under Marketing › Settings › Integrations.';

const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  THREADS: 'Threads',
  YOUTUBE: 'YouTube',
  LINKEDIN: 'LinkedIn',
  X: 'X',
};

/** What one check found — the shape an activity log can record as-is. */
export interface AccountHealth {
  account_id: string;
  platform: SocialPlatform;
  name: string;
  status: SocialAccountStatus;
  ok: boolean;
  /** The token is dead; a person must reconnect. */
  expired: boolean;
  message: string;
  /** Null for a token that does not expire. */
  expires_in_days: number | null;
  /** The messaging permission a Meta account lacks (DMs and private replies need it); null when it has it or the network has no DMs here. */
  messaging_missing_permission: string | null;
  checked_at: Date;
}

/** Whole days until the token lapses (0 or less: already lapsed); null when it never does. */
export function tokenExpiresInDays(expiresAt: Date | string | null | undefined, now = Date.now()): number | null {
  if (!expiresAt) return null;
  const at = new Date(expiresAt).getTime();
  if (Number.isNaN(at)) return null;
  const days = Math.ceil((at - now) / DAY_MS);
  // Math.ceil of a small negative is -0, which GraphQL and a strict equality both find odd.
  return days === 0 ? 0 : days;
}

interface Verdict {
  ok: boolean;
  expired: boolean;
  message: string;
  /** What Meta said about a Facebook Login token; absent for every other token. */
  token?: { scopes: string[] | null; expires_at: Date | null };
}

const REVOKED = 'Meta says this token is no longer valid — reconnect the account.';

const HEALTHY: Verdict = { ok: true, expired: false, message: '' };

/**
 * A Facebook Login token as Meta sees it: still valid, which permissions, and
 * when it lapses (0: never). The profile already read, so a failure here is the
 * app's credentials talking, not this token: logged, and the account stays healthy.
 */
async function tokenVerdict(accountId: string, creds: SocialAppCredentials, accessToken: string): Promise<Verdict> {
  try {
    const debug = await debugToken(creds, accessToken);
    if (debug.is_valid === false) return { ok: false, expired: true, message: REVOKED };
    const expiresAt = debug.expires_at ? new Date(debug.expires_at * 1000) : null;
    return { ...HEALTHY, token: { scopes: debug.scopes?.length ? debug.scopes : null, expires_at: expiresAt } };
  } catch (error) {
    logs.server.warn('social-accounts', 'debugToken', { error, account_id: accountId, msg: 'could not read the token from Meta' });
    return HEALTHY;
  }
}

/** One profile read, and what it says about the token. */
async function verdictOf(doc: AccountWithTokens): Promise<Verdict> {
  const creds = await socialCredentials(doc.provider);
  if (!creds) return { ok: false, expired: false, message: NOT_CONFIGURED };
  try {
    const reader = READERS[doc.platform];
    const handle = await freshHandle(doc, reader, creds);
    await reader.profile(handle, creds);
    if (usesFacebookGraph(handle)) return await tokenVerdict(String(doc._id), creds, handle.access_token);
    return HEALTHY;
  } catch (error) {
    const expired = error instanceof SocialApiError && error.expired;
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 500);
    return { ok: false, expired, message };
  }
}

interface HealthRow {
  _id: unknown;
  platform: SocialPlatform;
  scopes?: string[] | null;
  name?: string;
  status: SocialAccountStatus;
  token_expires_at?: Date | null;
  health_checked_at?: Date | null;
  alerted_at?: Date | null;
  owner_user_id?: unknown;
  connected_by?: unknown;
}

/** The stored account as a health summary — for anything that lists accounts and wants to say how each is. */
export function accountHealthOf(doc: HealthRow, verdict: Verdict, now = Date.now()): AccountHealth {
  return {
    account_id: String(doc._id),
    platform: doc.platform,
    name: doc.name ?? '',
    status: doc.status,
    ok: verdict.ok,
    expired: verdict.expired,
    message: verdict.message,
    expires_in_days: tokenExpiresInDays(doc.token_expires_at ?? null, now),
    messaging_missing_permission: DM_PERMISSION[doc.platform] ? missingDmPermission(doc) : null,
    checked_at: doc.health_checked_at ?? new Date(now),
  };
}

const escapeHtml = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

interface Alert {
  subject: string;
  html: string;
}

/** The reminder: what is wrong, which account, and where to put it right. */
function alertFor(health: AccountHealth, reconnectUrl: string): Alert {
  const network = PLATFORM_NAMES[health.platform];
  const name = escapeHtml(health.name || network);
  const days = health.expires_in_days ?? 0;
  const expired = health.expired || days <= 0;
  const subject = expired
    ? `Reconnect ${health.name || network} on ${network}`
    : `${health.name || network} on ${network}: access expires in ${days} day${days === 1 ? '' : 's'}`;
  const line = expired
    ? `Duncit can no longer read or post to <strong>${name}</strong> on ${network} — its access has expired.`
    : `Duncit’s access to <strong>${name}</strong> on ${network} expires in <strong>${days} day${days === 1 ? '' : 's'}</strong>.`;
  const html =
    `<p>${line}</p>` +
    `<p>Reconnect it under Social Accounts so posts keep going out and comments keep coming in: ` +
    `<a href="${escapeHtml(reconnectUrl)}">${escapeHtml(reconnectUrl)}</a></p>`;
  return { subject, html };
}

/** The owner's address, or the connector's when nobody owns the account; '' when neither has one. */
async function recipientOf(doc: HealthRow): Promise<string> {
  const userId = doc.owner_user_id ?? doc.connected_by;
  if (!userId) return '';
  const user = await UserModel.findById(userId).select('auth.email').lean<{ auth?: { email?: string } } | null>();
  return user?.auth?.email?.trim() ?? '';
}

/**
 * Email the owner once a day at most, while the token is a week from lapsing
 * or has lapsed. `alerted_at` is set only when a message actually went, so a
 * mail outage is retried on the next check rather than counted as sent.
 */
export async function sendExpiryAlert(doc: HealthRow, health: AccountHealth, now = Date.now()): Promise<boolean> {
  const days = health.expires_in_days;
  const alertDays = (await loadSocialSettings()).expiry_alert_days;
  const due = health.expired || (days !== null && days <= alertDays);
  if (!due) return false;
  const alertedAt = doc.alerted_at ? new Date(doc.alerted_at).getTime() : 0;
  if (alertedAt && now - alertedAt < DAY_MS) return false;
  const to = await recipientOf(doc);
  if (!to) {
    logs.server.warn('social-accounts', 'expiryAlert', { account_id: health.account_id, msg: 'no owner email to send the token reminder to' });
    return false;
  }
  const { marketingUrl } = await getUrlConfigs();
  const { subject, html } = alertFor(health, `${marketingUrl.replace(/\/+$/, '')}/social/accounts`);
  const sent = await sendHtmlEmail({ to, subject, html, category: 'transactional', source_detail: 'social-token-expiry' });
  if (sent.skipped) {
    logs.server.warn('social-accounts', 'expiryAlert', { account_id: health.account_id, reason: sent.reason, msg: 'token reminder was not sent' });
    return false;
  }
  await SocialAccountModel.updateOne({ _id: doc._id }, { $set: { alerted_at: new Date(now) } });
  return true;
}

/**
 * Check one account: read its profile, write the verdict to the row, flip it
 * to EXPIRED on a dead token, and remind the owner when the token is about to
 * lapse. Never throws for a network's refusal — that is the verdict. Returns
 * null when the account is gone.
 */
export async function checkAccountHealth(accountId: string, now = Date.now()): Promise<AccountHealth | null> {
  const doc = await SocialAccountModel.findById(accountId).select('+access_token +refresh_token').lean<AccountWithTokens>();
  if (!doc) return null;
  const verdict = await verdictOf(doc);
  const checkedAt = new Date(now);
  const set: Record<string, unknown> = { health_ok: verdict.ok, health_message: verdict.message, health_checked_at: checkedAt };
  if (verdict.expired) {
    set.status = 'EXPIRED';
    set.last_error = verdict.message;
  }
  if (verdict.token) {
    // Meta's own word on what the token holds, so the messaging flag and the expiry are current.
    if (verdict.token.scopes) set.scopes = verdict.token.scopes;
    set.token_expires_at = verdict.token.expires_at;
  }
  // The row after the write: a refresh inside the read may have moved token_expires_at.
  const after = await SocialAccountModel.findOneAndUpdate({ _id: doc._id }, { $set: set }, { returnDocument: 'after' }).lean<HealthRow>();
  if (!after) return null;
  const health = accountHealthOf(after, verdict, now);
  await sendExpiryAlert(after, health, now);
  return health;
}

/** The scheduler's pass: every account still worth checking, the longest unchecked first. */
export async function runHealthChecks(): Promise<AccountHealth[]> {
  const due = await SocialAccountModel.find({ status: { $ne: 'EXPIRED' } })
    .sort({ health_checked_at: 1 })
    .limit(CHECK_LIMIT)
    .select('_id')
    .lean();
  const results: AccountHealth[] = [];
  for (const account of due) {
    const health = await checkAccountHealth(String(account._id));
    if (health) results.push(health);
  }
  return results;
}

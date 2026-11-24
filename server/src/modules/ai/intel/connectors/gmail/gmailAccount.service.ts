import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { getUrlConfigs } from '@config/url-configs';
import { openToken, sealToken } from '@modules/crm/marketing/social/social.tokens';
import {
  buildConsentUrl,
  exchangeCode,
  googleOAuthCredentials,
  INTEL_GMAIL_PURPOSE,
  INTEL_GMAIL_SCOPES,
  readIdToken,
  trimTrailingSlash,
  verifyOAuthState,
} from '@modules/platform/mailAutomation/gmail.oauth';
import { logs } from '@observability/log';
import type { IntelActor } from '../../access/intel.access';
import { writeAudit } from '../../audit/intelAudit.service';
import { removeConnectorDocuments } from '../../index/intel.indexer';
import { scheduleSync } from '../../sync/intelSync.queue';
import { GMAIL_OAUTH_ENTRY } from '../intel.builtin';
import { IntelConnectorModel } from '../intelConnector.model';
import { IntelGmailAccountModel } from './gmailAccount.model';

/**
 * "Connect with Google" for Intel's Gmail source. Mailboxes are not an
 * environment: each connected account becomes one Gmail connector (environment
 * BOTH) that indexes it read-only. The Google OAuth client is the Tech portal's
 * (Google OAuth entry) and the callback is the one Mail Automation registered —
 * the signed state says which flow a callback belongs to.
 */

const READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
const DEFAULT_CONFIG = { query: 'in:inbox', max_threads: 500, include_attachments: false, history_days: 90 };

const notFound = () => new GraphQLError('Gmail account not found', { extensions: { code: 'NOT_FOUND' } });

/** A connector name that does not clash with an existing Gmail connector. */
async function freeName(email: string): Promise<string> {
  const base = email.slice(0, 80);
  if (!(await IntelConnectorModel.exists({ kind: 'GMAIL', name: base }))) return base;
  return `${email.slice(0, 70)} (Google)`;
}

async function ensureConnector(accountId: string, email: string, userId: string): Promise<void> {
  if (await IntelConnectorModel.exists({ kind: 'GMAIL', 'config.account_id': accountId })) return;
  const created = await IntelConnectorModel.create({
    kind: 'GMAIL',
    name: await freeName(email),
    environment: 'BOTH',
    env_entry_id: GMAIL_OAUTH_ENTRY,
    enabled: true,
    config: { account_id: accountId, ...DEFAULT_CONFIG },
    created_by: userId,
    updated_by: userId,
  });
  await scheduleSync(created, 'FULL', 'CREATE', userId);
}

async function revokeAtGoogle(refreshToken: string, email: string): Promise<void> {
  try {
    const res = await fetch(REVOKE_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: refreshToken }), signal: AbortSignal.timeout(10_000) });
    if (!res.ok) logs.server.warn('intel', 'gmailRevoke', { msg: `Google answered ${res.status} to the token revocation`, mailbox: email });
  } catch (error) {
    // The account is removed from Intel either way; the person can still revoke it in their Google account.
    logs.server.warn('intel', 'gmailRevoke', { error, mailbox: email });
  }
}

export const intelGmailAccounts = {
  /** Google's consent screen for one more mailbox (read-only). */
  async connectUrl(actor: IntelActor): Promise<string> {
    if (!(await googleOAuthCredentials())) {
      throw new GraphQLError('Google OAuth is not set up. Add a Client ID and Client Secret in Tech › Environment › Google OAuth.', { extensions: { code: 'FAILED_PRECONDITION' } });
    }
    return buildConsentUrl(actor.user.id, undefined, { scopes: INTEL_GMAIL_SCOPES, purpose: INTEL_GMAIL_PURPOSE });
  },

  /** Finish the round trip: keep the mailbox's refresh token (sealed) and make sure it has a connector. */
  async completeConnect(code: string, state: string): Promise<string> {
    const userId = verifyOAuthState(state, INTEL_GMAIL_PURPOSE);
    if (!userId) throw new Error('This Google sign-in expired or was not started from Intel. Try Connect with Google again.');
    const tokens = await exchangeCode(code);
    if (!tokens.scope.split(' ').includes(READONLY_SCOPE)) throw new Error('Gmail read access was not granted. Connect again and allow Duncit to read your email.');
    if (!tokens.refresh_token) throw new Error('Google did not return a refresh token. Remove Duncit from your Google account’s third-party access, then connect again.');
    const { email, sub } = readIdToken(tokens.id_token);
    if (!email) throw new Error('Google did not say which mailbox this is. Try again.');
    const account = await IntelGmailAccountModel.findOneAndUpdate(
      { email },
      { $set: { google_sub: sub, refresh_token: sealToken(tokens.refresh_token), connected_by: new Types.ObjectId(userId) } },
      { upsert: true, new: true }
    ).lean();
    await ensureConnector(String(account._id), email, userId);
    await writeAudit({ type: 'CONNECTOR', action: 'gmail.connect', userId, target: email, detail: 'Connected with Google (gmail.readonly)' });
    return email;
  },

  async list() {
    const [accounts, connectors] = await Promise.all([
      IntelGmailAccountModel.find().sort({ email: 1 }).lean(),
      IntelConnectorModel.find({ kind: 'GMAIL', 'config.account_id': { $exists: true } }, { config: 1 }).lean(),
    ]);
    const connectorOf = new Map(connectors.map((c) => [String((c.config as { account_id?: unknown }).account_id), String(c._id)]));
    return accounts.map((a) => ({ id: String(a._id), email: a.email, connected_at: a.created_at, updated_at: a.updated_at, connector_id: connectorOf.get(String(a._id)) ?? null }));
  },

  /** Remove the mailbox: its connector, everything indexed from it, and Google's grant. */
  async disconnect(actor: IntelActor, id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) throw notFound();
    const account = await IntelGmailAccountModel.findById(id).select('+refresh_token').lean();
    if (!account) throw notFound();
    const connectors = await IntelConnectorModel.find({ kind: 'GMAIL', 'config.account_id': id }, { _id: 1 }).lean();
    let removed = 0;
    for (const c of connectors) {
      removed += await removeConnectorDocuments(String(c._id));
      await IntelConnectorModel.deleteOne({ _id: c._id });
    }
    await IntelGmailAccountModel.deleteOne({ _id: account._id });
    await revokeAtGoogle(openToken(account.refresh_token), account.email);
    await writeAudit({ type: 'CONNECTOR', action: 'gmail.disconnect', userId: actor.user.id, level: actor.level, target: account.email, detail: `${removed} indexed document(s) removed` });
    return true;
  },

  /** Where the OAuth callback sends the browser: Intel › Settings › Gmail, with the outcome in the query. */
  async callbackRedirect(query: { code: string; state: string; denied: string }): Promise<string> {
    const destination = new URL(`${trimTrailingSlash((await getUrlConfigs()).intelUrl)}/setting/gmail`);
    if (query.denied || !query.code) {
      destination.searchParams.set('error', query.denied || 'missing_code');
      return destination.toString();
    }
    try {
      destination.searchParams.set('connected', await this.completeConnect(query.code, query.state));
    } catch (error) {
      logs.server.error('intel', 'gmailConnect', { error, msg: 'could not complete the Gmail connection' });
      destination.searchParams.set('error', (error instanceof Error ? error.message : String(error)).slice(0, 700));
    }
    return destination.toString();
  },
};

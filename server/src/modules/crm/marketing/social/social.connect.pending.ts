import { GraphQLError } from 'graphql';
import { Schema, isValidObjectId, model } from 'mongoose';
import { saveDiscovered, startFirstSync } from './social.accounts.save';
import { socialCredentials } from './social.credentials';
import { subscribeConnectedPages } from './social.dm.sync';
import { SocialAccountModel } from './social.model';
import type { ConnectState } from './social.oauth';
import { openToken, sealToken } from './social.tokens';
import { SOCIAL_PLATFORMS, SOCIAL_PROVIDERS, type DiscoveredAccount, type SocialPlatform, type SocialProvider } from './social.types';

/**
 * Every grant is detected before anything is stored: a Meta login hands back
 * each Page the person picked in Account Center and the Instagram account
 * linked to it; YouTube, LinkedIn, X and Threads hand back their channels or
 * profiles. The callback holds what was found here, sealed, for HOLD_MINUTES,
 * and the Accounts page shows it as a list to tick. Only the ticked accounts
 * are created (each with its real platform); one already connected is shown
 * as such and is refreshed only when the grant came from a Reconnect. So
 * Connect can be pressed again and again — another Meta login, another
 * channel — and each adds its own rows without touching the ones before.
 *
 * Only the person who started the connection can read or finish it.
 */
const HOLD_MINUTES = 30;

const heldAccountSchema = new Schema(
  {
    platform: { type: String, enum: SOCIAL_PLATFORMS, required: true },
    external_id: { type: String, required: true },
    name: { type: String, default: '' },
    handle: { type: String, default: '' },
    avatar_url: { type: String, default: '' },
    profile_url: { type: String, default: '' },
    followers: { type: Number, default: 0 },
    meta: { type: Schema.Types.Mixed, default: {} },
    access_token: { type: String, default: '' },
    refresh_token: { type: String, default: '' },
    token_expires_at: { type: Date, default: null },
    scopes: { type: [String], default: [] },
  },
  { _id: false }
);

const pendingSchema = new Schema({
  user_id: { type: String, required: true },
  provider: { type: String, enum: SOCIAL_PROVIDERS, required: true },
  env_entry_id: { type: String, default: '' },
  reconnect: { type: Boolean, default: false },
  accounts: { type: [heldAccountSchema], default: [] },
  created_at: { type: Date, default: Date.now, expires: HOLD_MINUTES * 60 },
});

const SocialPendingConnectModel = model('SocialPendingConnect', pendingSchema);

interface HeldAccount {
  platform: SocialPlatform;
  external_id: string;
  name?: string | null;
  handle?: string | null;
  avatar_url?: string | null;
  profile_url?: string | null;
  followers?: number | null;
  meta?: Record<string, string> | null;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: Date | null;
  scopes?: string[] | null;
}

interface Pending {
  _id: unknown;
  provider: SocialProvider;
  env_entry_id?: string | null;
  reconnect?: boolean | null;
  accounts: HeldAccount[];
}

/** One account's identity: platform and network id — never its handle, which two networks can share. */
export const accountKey = (account: { platform: string; external_id: string }) => `${account.platform}:${account.external_id}`;

function refuse(code: string, message: string): never {
  throw new GraphQLError(message, { extensions: { code } });
}

/** Keep what the grant found until the marketer picks; returns the id the Accounts page opens it by. */
export async function holdDiscovered(parsed: ConnectState, found: DiscoveredAccount[]): Promise<string> {
  const doc = await SocialPendingConnectModel.create({
    user_id: parsed.userId,
    provider: parsed.provider,
    env_entry_id: parsed.appId,
    reconnect: parsed.reconnect,
    accounts: found.map(({ tokens, ...profile }) => ({
      ...profile,
      access_token: sealToken(tokens.access_token),
      refresh_token: sealToken(tokens.refresh_token),
      token_expires_at: tokens.expires_at,
      scopes: tokens.scopes,
    })),
  });
  return String(doc._id);
}

const fresh = () => new Date(Date.now() - HOLD_MINUTES * 60_000);

async function heldBy(id: string, userId: string): Promise<Pending> {
  const doc = isValidObjectId(id)
    ? await SocialPendingConnectModel.findOne({ _id: id, user_id: userId, created_at: { $gt: fresh() } }).lean<Pending>()
    : null;
  if (!doc) refuse('NOT_FOUND', 'This connection has expired or was already finished. Press Connect again.');
  return doc;
}

async function connectedKeys(accounts: HeldAccount[]): Promise<Set<string>> {
  if (accounts.length === 0) return new Set();
  const rows = await SocialAccountModel.find({ $or: accounts.map((a) => ({ platform: a.platform, external_id: a.external_id })) })
    .select('platform external_id')
    .lean();
  return new Set(rows.map(accountKey));
}

/** What the picker shows: every account found, which are already connected, and how many of each kind. */
export async function pendingConnection(id: string, userId: string) {
  const pending = await heldBy(id, userId);
  const connected = await connectedKeys(pending.accounts);
  const count = (platform: SocialPlatform) => pending.accounts.filter((a) => a.platform === platform).length;
  return {
    id: String(pending._id),
    provider: pending.provider,
    reconnect: Boolean(pending.reconnect),
    pages_found: count('FACEBOOK'),
    instagram_found: count('INSTAGRAM'),
    found: pending.accounts.length,
    accounts: pending.accounts.map((a) => ({
      key: accountKey(a),
      platform: a.platform,
      external_id: a.external_id,
      name: a.name ?? '',
      handle: a.handle ?? '',
      avatar_url: a.avatar_url ?? '',
      connected: connected.has(accountKey(a)),
    })),
  };
}

const opened = (a: HeldAccount): DiscoveredAccount => ({
  platform: a.platform,
  external_id: a.external_id,
  name: a.name ?? '',
  handle: a.handle ?? '',
  avatar_url: a.avatar_url ?? '',
  profile_url: a.profile_url ?? '',
  followers: a.followers ?? 0,
  meta: a.meta ?? {},
  tokens: { access_token: openToken(a.access_token), refresh_token: openToken(a.refresh_token), expires_at: a.token_expires_at ?? null, scopes: a.scopes ?? [] },
});

/** The Pages to subscribe to the webhook: each one stored, and each one whose Instagram account was. */
function pagesFor(all: HeldAccount[], saved: HeldAccount[]): HeldAccount[] {
  const keys = new Set(saved.map(accountKey));
  const linked = new Set(saved.filter((a) => a.platform === 'INSTAGRAM').map((a) => a.meta?.page_id ?? '').filter(Boolean));
  return all.filter((a) => a.platform === 'FACEBOOK' && (keys.has(accountKey(a)) || linked.has(a.external_id)));
}

/**
 * Create the ticked accounts (and, on a Reconnect, refresh the ones already
 * connected), subscribe their Pages to the webhook and start the first read.
 * The held grant is used up on the way: a second press cannot store it twice.
 */
export async function completePending(id: string, userId: string, keys: readonly string[]): Promise<{ provider: SocialProvider; count: number }> {
  const pending = await heldBy(id, userId);
  const known = new Set(pending.accounts.map(accountKey));
  if (keys.some((key) => !known.has(key))) refuse('BAD_USER_INPUT', 'One of the ticked accounts was not part of this connection.');
  const connected = await connectedKeys(pending.accounts);
  const ticked = new Set(keys);
  const toSave = pending.accounts.filter((a) => {
    const key = accountKey(a);
    return connected.has(key) ? Boolean(pending.reconnect) : ticked.has(key);
  });
  if (toSave.length === 0) refuse('BAD_USER_INPUT', 'Tick at least one account to connect.');
  const claimed = await SocialPendingConnectModel.deleteOne({ _id: pending._id, user_id: userId });
  if (claimed.deletedCount === 0) refuse('CONFLICT', 'This connection was already finished.');

  const appId = pending.env_entry_id ?? '';
  const ids = await saveDiscovered(pending.provider, toSave.map(opened), userId, appId);
  const creds = await socialCredentials(pending.provider, appId);
  if (creds) await subscribeConnectedPages(pagesFor(pending.accounts, toSave).map(opened), creds);
  startFirstSync(ids);
  return { provider: pending.provider, count: ids.length };
}

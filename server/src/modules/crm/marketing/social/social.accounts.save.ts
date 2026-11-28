import { logs } from '@observability/log';
import { SocialAccountModel } from './social.model';
import { syncSocialAccount } from './social.sync';
import { sealToken } from './social.tokens';
import type { DiscoveredAccount, SocialProvider } from './social.types';

/**
 * Store what a handshake found. An account is one row per (platform, network
 * id) — never per handle, which a Threads profile and an Instagram account can
 * share — so reconnecting refreshes its tokens in place and a second account
 * on the same network is a second row. The tokens are sealed before they are
 * written. Whoever connects becomes the owner unless somebody already is: a
 * reconnect by a colleague must not quietly take an account away from the
 * person looking after it. The app it came through is kept with it ('' — the
 * default — is stored as null), since its tokens only work with that app.
 *
 * A fresh token starts the account's health and messaging notes over: the
 * last failure no longer applies, and the next read or webhook subscription
 * writes what is true now.
 */
export async function saveDiscovered(provider: SocialProvider, accounts: DiscoveredAccount[], userId: string, appId: string): Promise<string[]> {
  const ids: string[] = [];
  for (const account of accounts) {
    const { tokens, ...profile } = account;
    const doc = await SocialAccountModel.findOneAndUpdate(
      { platform: account.platform, external_id: account.external_id },
      {
        $set: {
          ...profile,
          provider,
          access_token: sealToken(tokens.access_token),
          refresh_token: sealToken(tokens.refresh_token),
          token_expires_at: tokens.expires_at,
          scopes: tokens.scopes,
          status: 'CONNECTED',
          last_error: '',
          connected_by: userId,
          env_entry_id: appId || null,
          health_ok: null,
          health_message: '',
          alerted_at: null,
          dm_error: '',
          webhook_error: '',
        },
      },
      { upsert: true, returnDocument: 'after', projection: { _id: 1 } }
    );
    if (!doc) continue;
    await SocialAccountModel.updateOne({ _id: doc._id, owner_user_id: null }, { $set: { owner_user_id: userId } });
    ids.push(String(doc._id));
  }
  return ids;
}

/** The first read of each new or refreshed account, in the background: the marketer is already on their way back. */
export function startFirstSync(ids: readonly string[]): void {
  for (const id of ids) {
    syncSocialAccount(id).catch((error: unknown) => {
      logs.server.error('social-accounts', 'firstSync', { error, account_id: id, msg: 'first sync failed' });
    });
  }
}

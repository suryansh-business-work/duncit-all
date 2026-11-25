import { logs } from '@observability/log';
import { inSequence } from '@utils/in-sequence';
import { isFacebookLogin } from './providers/meta';
import { recentConversations, subscribePageWebhooks } from './providers/meta.messaging';
import { SocialConversationModel } from './social.conversation.model';
import { recordDm } from './social.dm.ingest';
import { SocialAccountModel } from './social.model';
import { loadSocialSettings } from './social.settings';
import { missingDmPermission } from './social.window';
import type { DiscoveredAccount, SocialAccountHandle, SocialAppCredentials, SocialPlatform } from './social.types';

/**
 * The fallback and the backfill for direct messages: the Page's conversations
 * updated since this account's cursor (`dm_synced_at`), stored through the same
 * door as a webhook (recordDm), so a message both brought is kept once. The
 * first pass reaches back `backfill_days` (Settings). An account without the
 * messaging permission, or an Instagram account not linked to a Page, is left
 * alone — nothing to read.
 */
interface SyncAccount {
  _id: unknown;
  platform: SocialPlatform;
  scopes?: string[] | null;
  dm_synced_at?: Date | null;
}

const DAY_MS = 86_400_000;

type Conversation = Awaited<ReturnType<typeof recentConversations>>[number];

/** One conversation's messages, oldest first, so its latest message is the one left as its preview. Resolves to how many were new. */
async function storeConversation(account: SyncAccount, accountId: string, conversation: Conversation): Promise<number> {
  const messages = [...conversation.messages].sort((a, b) => a.sent_at.getTime() - b.sent_at.getTime());
  const recorded = await inSequence(messages, (message) =>
    recordDm({
      account_id: accountId,
      platform: account.platform,
      participant_id: conversation.participant.id,
      direction: message.from_id === conversation.participant.id ? 'IN' : 'OUT',
      external_id: message.external_id,
      text: message.text,
      attachments: message.attachments,
      sent_at: message.sent_at,
      external_thread_id: conversation.external_thread_id,
    })
  );
  const conversationId = recorded.at(-1)?.conversation_id;
  // The conversation list already names the person: no profile call needed.
  if (conversationId) {
    await SocialConversationModel.updateOne(
      { _id: conversationId, 'participant.username': '' },
      { $set: { 'participant.username': conversation.participant.username ?? '', 'participant.name': conversation.participant.name ?? '' } }
    );
  }
  return recorded.filter((one) => !one.duplicate).length;
}

export async function syncConversations(account: SyncAccount, handle: SocialAccountHandle, creds: SocialAppCredentials): Promise<number> {
  if (missingDmPermission(account)) return 0;
  const accountId = String(account._id);
  const startedAt = new Date();
  const settings = await loadSocialSettings();
  const since = account.dm_synced_at ?? new Date(startedAt.getTime() - settings.backfill_days * DAY_MS);
  const conversations = await recentConversations(handle, since, creds);
  const stored = await inSequence(conversations, (conversation) => storeConversation(account, accountId, conversation));
  await SocialAccountModel.updateOne({ _id: accountId }, { $set: { dm_synced_at: startedAt } });
  return stored.reduce((sum, count) => sum + count, 0);
}

/**
 * Right after a connect: each Page connected through Facebook Login is
 * subscribed to this app's webhook (DMs and comments on the Page and on its
 * Instagram account then arrive in seconds). Needs `pages_manage_metadata`;
 * when Meta refuses, the reason is kept on the account for Social Accounts to
 * show, and the scheduled sync still reads everything. Pages are independent,
 * so they are subscribed side by side.
 */
export async function subscribeConnectedPages(found: readonly DiscoveredAccount[], creds: SocialAppCredentials): Promise<void> {
  const pages = found.filter((account) => account.platform === 'FACEBOOK' && isFacebookLogin(account.meta));
  await Promise.all(
    pages.map(async (page) => {
      const refusal = await subscribePageWebhooks(page.external_id, page.tokens.access_token, creds).then(
        () => '',
        (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 500)
      );
      await SocialAccountModel.updateOne({ platform: 'FACEBOOK', external_id: page.external_id }, { $set: { webhook_error: refusal } });
      if (refusal) logs.server.warn('social-accounts', 'subscribePageWebhooks', { page_id: page.external_id, msg: refusal });
    })
  );
}

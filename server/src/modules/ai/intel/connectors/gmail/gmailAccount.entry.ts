import { Types } from 'mongoose';
import { openToken } from '@modules/crm/marketing/social/social.tokens';
import { googleOAuthCredentials } from '@modules/platform/mailAutomation/gmail.oauth';
import type { ResolvedEntry } from '../intel.credentials';
import { IntelGmailAccountModel } from './gmailAccount.model';

/**
 * A Gmail account connected with Google, as the entry the Gmail driver reads:
 * the Tech portal's Google OAuth client plus this mailbox's own refresh token.
 * Null when the account was disconnected or Google OAuth is not set up.
 */
export async function gmailAccountEntry(accountId: string): Promise<ResolvedEntry | null> {
  if (!Types.ObjectId.isValid(accountId)) return null;
  const [account, creds] = await Promise.all([IntelGmailAccountModel.findById(accountId).select('+refresh_token').lean(), googleOAuthCredentials()]);
  if (!account || !creds) return null;
  return { id: String(account._id), name: account.email, config: { client_id: creds.clientId, client_secret: creds.clientSecret, refresh_token: openToken(account.refresh_token), mailbox: account.email } };
}

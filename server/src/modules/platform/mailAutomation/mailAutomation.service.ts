import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import {
  MailAutomationAccountModel,
  MailAutomationThreadModel,
  type IMailAutomationAccount,
  type MailTicketType,
} from './mailAutomation.model';
import {
  buildConsentUrl,
  exchangeCode,
  googleOAuthCredentials,
  readIdToken,
  refreshAccessToken,
  verifyOAuthState,
} from './gmail.oauth';
import { getProfile } from './gmail.api';
import { previewReply, slaLabel } from './mailAutomation.reply';

/**
 * Mail automation, from the outside: connect a mailbox, write its rule, read
 * what it has been doing.
 *
 * The split in this file mirrors the split in the product. Connecting and
 * disconnecting belong to Tech, because they are credentials. The rule —
 * what the reply says, which queue it opens, how long a reply is promised —
 * belongs to Support, because it is their promise to keep.
 */

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/** Refresh this long before the access token actually dies, so a poll that
 * takes a few seconds cannot start valid and finish expired. */
const TOKEN_REFRESH_MARGIN_MS = 120_000;

/** The two the feature cannot work without: read the mailbox, and answer from
 * it. `openid`/`userinfo.email` are only how we learn which mailbox it is, and
 * Gmail's profile call covers that too, so they are not required here. */
const REQUIRED_GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

export interface MailAutomationRuleInput {
  id: string;
  reply_template?: string | null;
  ai_enabled?: boolean | null;
  ticket_type?: MailTicketType | null;
  sla_min_hours?: number | null;
  sla_max_hours?: number | null;
  is_active?: boolean | null;
}

/** The account as every client sees it — never the tokens. */
const toPub = (doc: IMailAutomationAccount) => ({
  id: String(doc._id),
  email: doc.email,
  display_name: doc.display_name,
  is_active: doc.is_active,
  reply_template: doc.reply_template,
  ai_enabled: doc.ai_enabled,
  ticket_type: doc.ticket_type,
  sla_min_hours: doc.sla_min_hours,
  sla_max_hours: doc.sla_max_hours,
  sla_label: slaLabel(doc.sla_min_hours, doc.sla_max_hours),
  // Whether the mailbox can still be read at all. A revoked grant is invisible
  // until something tries to use it, so the portals show this rather than a
  // green dot that only means "a row exists".
  is_connected: Boolean(doc.refresh_token),
  last_polled_at: doc.last_polled_at ? doc.last_polled_at.toISOString() : null,
  last_error: doc.last_error,
  connected_at: doc.connected_at.toISOString(),
});

export type PublicMailAccount = ReturnType<typeof toPub>;

async function findAccount(id: string): Promise<IMailAutomationAccount> {
  if (!Types.ObjectId.isValid(id)) throw badInput('Unknown mailbox');
  const account = await MailAutomationAccountModel.findById(id);
  if (!account) throw badInput('Unknown mailbox');
  return account;
}

/** Both ends of the response window, sanity-checked. Support types these, and
 * "48 to 24 hours" is a promise nobody can read. GraphQL has already made
 * these integers, so only the ranges and the ordering are left to check. */
function normaliseSla(min: number, max: number): { min: number; max: number } {
  if (min < 1 || max < 1) throw badInput('Response window must be at least 1 hour');
  if (min > 720 || max > 720) throw badInput('Response window cannot exceed 720 hours (30 days)');
  if (min > max) throw badInput('Minimum hours cannot be greater than maximum hours');
  return { min, max };
}

export const mailAutomationService = {
  /** Whether a Google OAuth client exists to connect a mailbox with. */
  async configured(): Promise<boolean> {
    return (await googleOAuthCredentials()) !== null;
  },

  async listAccounts(): Promise<PublicMailAccount[]> {
    const docs = await MailAutomationAccountModel.find().sort({ created_at: 1 });
    return docs.map(toPub);
  },

  /** Step 1, Tech side: the Google consent URL to send the operator to. */
  connectUrl(userId: string, loginHint?: string | null): Promise<string> {
    return buildConsentUrl(userId, loginHint ?? undefined);
  },

  /**
   * The other half of step 1, called by the OAuth callback route.
   *
   * Baselines the history cursor at the mailbox's CURRENT position, so
   * connecting a mailbox never answers the backlog already sitting in it —
   * which would mean a hundred tickets and a hundred emails to people who
   * wrote in weeks ago.
   */
  async completeConnect(
    code: string,
    state: string
  ): Promise<{ account: PublicMailAccount; alreadyConnected: boolean }> {
    const userId = verifyOAuthState(state);
    if (!userId) throw badInput('This connect link has expired. Start again from the Tech portal.');

    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) {
      throw badInput(
        'Google did not return a refresh token. Remove Duncit from the account’s third-party access and connect again.'
      );
    }

    /*
      Google's consent screen lets the operator untick individual scopes.

      Unticking "send" is the dangerous one, because everything else still
      works: the poller reads the mailbox happily and opens a real ticket for
      every email, and only the acknowledgement fails — so senders get silence
      while the queue fills up, and the mailbox looks connected the whole time.
      Refusing the connection here is the only place that is cheap to notice.
    */
    const granted = new Set(tokens.scope ? tokens.scope.split(' ') : []);
    const missing = REQUIRED_GMAIL_SCOPES.filter((scope) => !granted.has(scope));
    if (missing.length > 0) {
      throw badInput(
        `Connect again and leave every permission ticked — Duncit did not receive: ${missing.join(', ')}.`
      );
    }

    const profile = await getProfile(tokens.access_token);
    const identity = readIdToken(tokens.id_token);
    const email = (identity.email || profile.emailAddress || '').toLowerCase();
    if (!email) throw badInput('Google did not say which mailbox was connected');

    // Checked BEFORE the upsert, which would otherwise make the two cases
    // indistinguishable. Re-connecting an address that is already set up is
    // usually deliberate (repairing a revoked grant) but it is also exactly
    // what an operator does when they have forgotten it was already connected,
    // and they deserve to be told rather than left guessing whether they just
    // replaced Support's rule.
    const alreadyConnected = (await MailAutomationAccountModel.exists({ email })) !== null;

    const now = Date.now();
    const account = await MailAutomationAccountModel.findOneAndUpdate(
      { email },
      {
        $set: {
          google_sub: identity.sub,
          refresh_token: tokens.refresh_token,
          access_token: tokens.access_token,
          access_token_expires_at: new Date(now + tokens.expires_in * 1000),
          granted_scopes: tokens.scope ? tokens.scope.split(' ') : [],
          last_history_id: profile.historyId,
          last_error: '',
          connected_by: new Types.ObjectId(userId),
          connected_at: new Date(now),
        },
        // Only on insert: re-connecting a mailbox to refresh a revoked grant
        // must not silently reset the rule Support wrote for it.
        $setOnInsert: { email, is_active: true },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    logs.server.info('mail-automation', 'completeConnect', { mailbox: email, alreadyConnected });
    return { account: toPub(account), alreadyConnected };
  },

  /**
   * Tech side: forget the mailbox.
   *
   * The thread rows stay. They are keyed by address rather than by this
   * document's id, so they are both the audit trail for tickets that really
   * exist AND the thing that stops a reconnected mailbox from answering a live
   * conversation a second time.
   */
  async disconnect(id: string): Promise<boolean> {
    const account = await findAccount(id);
    await MailAutomationAccountModel.deleteOne({ _id: account._id });
    logs.server.info('mail-automation', 'disconnect', { mailbox: account.email });
    return true;
  },

  /** Support side: steps 2 and 3 — the message, the queue, the window. */
  async updateRule(input: MailAutomationRuleInput): Promise<PublicMailAccount> {
    const account = await findAccount(input.id);

    if (input.reply_template !== undefined && input.reply_template !== null) {
      const template = input.reply_template.trim();
      if (!template) throw badInput('The reply message cannot be empty');
      if (!template.includes('{{ticket_no}}')) {
        throw badInput(
          'The reply message must include {{ticket_no}} — it is the reference the sender quotes back.'
        );
      }
      account.reply_template = template;
    }
    // The enum is validated by GraphQL before this runs, so there is nothing
    // left to check about the value itself.
    if (input.ticket_type) account.ticket_type = input.ticket_type;
    if (input.ai_enabled !== undefined && input.ai_enabled !== null) {
      account.ai_enabled = input.ai_enabled;
    }
    if (input.is_active !== undefined && input.is_active !== null) {
      account.is_active = input.is_active;
    }

    const min = input.sla_min_hours ?? account.sla_min_hours;
    const max = input.sla_max_hours ?? account.sla_max_hours;
    const sla = normaliseSla(min, max);
    account.sla_min_hours = sla.min;
    account.sla_max_hours = sla.max;

    await account.save();
    return toPub(account);
  },

  /**
   * Read back what a sender would actually receive.
   *
   * Takes the same input as the save, and applies it to an unsaved copy of the
   * account. A preview that could only show the SAVED rule would answer the
   * wrong question — the operator is looking at the message they just typed,
   * and wants to know what that one does.
   */
  async preview(input: MailAutomationRuleInput): Promise<{ text: string; by_ai: boolean }> {
    const account = await findAccount(input.id);
    if (input.reply_template) account.reply_template = input.reply_template;
    if (input.ticket_type) account.ticket_type = input.ticket_type;
    if (input.ai_enabled !== undefined && input.ai_enabled !== null) {
      account.ai_enabled = input.ai_enabled;
    }
    const sla = normaliseSla(
      input.sla_min_hours ?? account.sla_min_hours,
      input.sla_max_hours ?? account.sla_max_hours
    );
    account.sla_min_hours = sla.min;
    account.sla_max_hours = sla.max;
    const composed = await previewReply(account);
    return { text: composed.text, by_ai: composed.byAi };
  },

  /** The conversations this mailbox has already answered — proof the rule is
   * running, and the audit trail for "why did this ticket appear". */
  async recentThreads(accountId: string, limit = 20) {
    const account = await findAccount(accountId);
    const rows = await MailAutomationThreadModel.find({ mailbox_email: account.email })
      .sort({ created_at: -1 })
      .limit(Math.min(Math.max(limit, 1), 100))
      .lean();
    return rows.map((row) => ({
      id: String(row._id),
      from_email: row.from_email,
      from_name: row.from_name,
      subject: row.subject,
      ticket_type: row.ticket_type,
      ticket_no: row.ticket_no,
      replied_at: row.replied_at ? row.replied_at.toISOString() : null,
      reply_error: row.reply_error,
      reply_by_ai: row.reply_by_ai,
      created_at: row.created_at.toISOString(),
    }));
  },

  /**
   * A usable access token for the mailbox, refreshed and persisted when the
   * one on the document is spent. Persisted rather than cached in memory
   * because two server processes behind the same Mongo would otherwise each
   * hold their own, and Google rate-limits refreshes.
   */
  async accessTokenFor(account: IMailAutomationAccount): Promise<string> {
    const expiresAt = account.access_token_expires_at?.getTime() ?? 0;
    if (account.access_token && expiresAt - TOKEN_REFRESH_MARGIN_MS > Date.now()) {
      return account.access_token;
    }
    if (!account.refresh_token) {
      throw new Error(`Mailbox ${account.email} is not connected`);
    }
    const tokens = await refreshAccessToken(account.refresh_token);
    account.access_token = tokens.access_token;
    account.access_token_expires_at = new Date(Date.now() + tokens.expires_in * 1000);
    await account.save();
    return tokens.access_token;
  },
};

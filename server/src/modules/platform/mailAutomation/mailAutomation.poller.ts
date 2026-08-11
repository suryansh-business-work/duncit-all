import { logs } from '@observability/log';
import {
  MailAutomationAccountModel,
  MailAutomationThreadModel,
  type IMailAutomationAccount,
} from './mailAutomation.model';
import {
  getMessage,
  getProfile,
  listAddedMessages,
  sendReply,
  HistoryExpiredError,
  type GmailMessageRef,
  type InboundMessage,
} from './gmail.api';
import { mailAutomationService } from './mailAutomation.service';
import { openTicketForEmail } from './mailAutomation.tickets';
import { composeReply } from './mailAutomation.reply';

/**
 * The loop that makes the mailbox answer itself.
 *
 * Every active mailbox is read forward from its stored history cursor. A
 * message opens a ticket and gets one acknowledgement — once, ever, per
 * conversation. Everything after that on the same thread is somebody replying
 * to a human, and the automation stays out of it.
 */

const POLL_INTERVAL_MS = 120_000;
const FIRST_POLL_DELAY_MS = 30_000;
const MONGO_DUPLICATE_KEY = 11000;

/** One sweep at a time. A mailbox with a slow OpenAI call must not have a
 * second sweep start behind it and race it for the same thread. */
let sweepInFlight = false;

const isDuplicateKey = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: number }).code === MONGO_DUPLICATE_KEY;

/**
 * Claim the conversation before doing any work on it.
 *
 * The unique index on (mailbox_email, gmail_thread_id) is the lock. Whoever
 * inserts first owns the thread; a duplicate-key error means somebody already
 * has it — another process, or an earlier poll that saw the same message —
 * and the correct response is to walk away. Doing this BEFORE the ticket is
 * opened is what stops one email becoming two tickets.
 */
async function claimThread(
  account: IMailAutomationAccount,
  message: InboundMessage
): Promise<boolean> {
  try {
    await MailAutomationThreadModel.create({
      mailbox_email: account.email,
      gmail_thread_id: message.threadId,
      gmail_message_id: message.id,
      from_email: message.fromEmail,
      from_name: message.fromName,
      subject: message.subject,
      ticket_type: account.ticket_type,
    });
    return true;
  } catch (error) {
    if (isDuplicateKey(error)) return false;
    throw error;
  }
}

/** Not every arrival deserves a ticket. */
function shouldAnswer(account: IMailAutomationAccount, message: InboundMessage): boolean {
  if (!message.fromEmail) return false;
  // Our own reply comes back through history as well.
  if (message.fromEmail === account.email) return false;
  // Vacation responders, bounces and mailing lists. Answering one of these is
  // how two robots end up mailing each other until somebody notices.
  return !message.isAutomated;
}

/** Open the ticket, write the reply, send it — and record which of those got
 * as far as happening. A ticket that exists but was never acknowledged is a
 * different problem from one that was never opened, and the row says which. */
async function answerMessage(
  account: IMailAutomationAccount,
  token: string,
  message: InboundMessage
): Promise<void> {
  const opened = await openTicketForEmail(account.ticket_type, {
    fromEmail: message.fromEmail,
    fromName: message.fromName,
    subject: message.subject,
    bodyText: message.bodyText,
  });
  await MailAutomationThreadModel.updateOne(
    { mailbox_email: account.email, gmail_thread_id: message.threadId },
    // ticket_type too: on a resumed claim the row was stamped with whatever
    // the rule said when it was claimed, and the ticket just opened followed
    // the rule as it stands now. The row has to name the one that exists.
    {
      $set: {
        ticket_id: opened.ticket_id,
        ticket_no: opened.ticket_no,
        ticket_type: account.ticket_type,
      },
    }
  );

  const composed = await composeReply(account, {
    ticketNo: opened.ticket_no,
    senderName: message.fromName,
    senderEmail: message.fromEmail,
    subject: message.subject,
    bodyText: message.bodyText,
  });

  try {
    await sendReply(token, {
      fromEmail: account.email,
      fromName: account.display_name || 'Duncit',
      toEmail: message.fromEmail,
      subject: message.subject || 'Your message',
      bodyText: composed.text,
      threadId: message.threadId,
      inReplyTo: message.messageIdHeader,
      references: message.referencesHeader,
    });
    await MailAutomationThreadModel.updateOne(
      { mailbox_email: account.email, gmail_thread_id: message.threadId },
      { $set: { replied_at: new Date(), reply_by_ai: composed.byAi, reply_error: '' } }
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await MailAutomationThreadModel.updateOne(
      { mailbox_email: account.email, gmail_thread_id: message.threadId },
      { $set: { reply_error: reason.slice(0, 500) } }
    );
    logs.server.error('mail-automation', 'answerMessage', {
      error,
      mailbox: account.email,
      ticket_no: opened.ticket_no,
      msg: 'ticket opened but the acknowledgement could not be sent',
    });
  }
}

async function handleArrival(
  account: IMailAutomationAccount,
  token: string,
  ref: GmailMessageRef
): Promise<void> {
  // The cheap check first: a reply on a thread we already handled needs no
  // fetch at all, and replies are the common case in a live mailbox.
  const known = await MailAutomationThreadModel.findOne({
    mailbox_email: account.email,
    gmail_thread_id: ref.threadId,
  })
    .select('ticket_no')
    .lean();

  // A row WITH a ticket number is a conversation we have answered. This is the
  // same-thread rule: everything after the first message belongs to a human.
  if (known?.ticket_no) return;

  const message = await getMessage(token, ref.id);
  if (!shouldAnswer(account, message)) return;

  // A row WITHOUT one is our own claim from a sweep that was interrupted
  // between claiming the thread and opening the ticket. Finishing it is the
  // only way that sender ever gets an answer — skipping it would leave them
  // with neither a ticket nor a reply, and nothing would ever look again.
  if (!known && !(await claimThread(account, message))) return;

  await answerMessage(account, token, message);
}

/**
 * One message must never cost the mailbox its cursor.
 *
 * If a single arrival throws, the exception unwinds the whole sweep and the
 * history cursor is never advanced — so the identical batch replays every two
 * minutes, dies on the identical message, and every legitimate email behind it
 * goes unanswered until Gmail expires the cursor a week later and the entire
 * backlog is discarded. Isolating each message turns "this mailbox is dead"
 * into "this one email needs a look", which is what it actually is.
 *
 * The failure is recorded on the thread row when one was claimed, so Support
 * sees it in Recently answered instead of it living only in the logs.
 */
async function handleArrivalSafely(
  account: IMailAutomationAccount,
  token: string,
  ref: GmailMessageRef
): Promise<void> {
  try {
    await handleArrival(account, token, ref);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logs.server.error('mail-automation', 'handleArrival', {
      error,
      mailbox: account.email,
      gmail_message_id: ref.id,
      gmail_thread_id: ref.threadId,
      msg: 'could not handle this message; the sweep continues past it',
    });
    await MailAutomationThreadModel.updateOne(
      { mailbox_email: account.email, gmail_thread_id: ref.threadId },
      { $set: { reply_error: reason.slice(0, 500) } }
    ).catch(() => undefined);
  }
}

/** Point the cursor at the mailbox as it is right now. Used on the very first
 * poll and after Gmail expires a cursor — in both cases the alternative is
 * answering mail that is already old news. */
async function rebaseline(account: IMailAutomationAccount, token: string): Promise<void> {
  const profile = await getProfile(token);
  account.last_history_id = profile.historyId;
  account.last_polled_at = new Date();
  await account.save();
}

export async function pollAccount(account: IMailAutomationAccount): Promise<void> {
  const token = await mailAutomationService.accessTokenFor(account);
  if (!account.last_history_id) {
    await rebaseline(account, token);
    return;
  }

  let added;
  try {
    added = await listAddedMessages(token, account.last_history_id);
  } catch (error) {
    if (!(error instanceof HistoryExpiredError)) throw error;
    logs.server.warn('mail-automation', 'pollAccount', {
      mailbox: account.email,
      msg: 'Gmail history cursor expired; re-baselining to the current mailbox position',
    });
    await rebaseline(account, token);
    return;
  }

  for (const ref of added.messages) {
    await handleArrivalSafely(account, token, ref);
  }

  account.last_history_id = added.historyId;
  account.last_polled_at = new Date();
  account.last_error = '';
  await account.save();
  if (added.truncated) {
    logs.server.info('mail-automation', 'pollAccount', {
      mailbox: account.email,
      msg: 'history walk hit its page cap; the cursor stops at the last record read and the next sweep continues',
    });
  }
}

/** One pass over every active, connected mailbox. A mailbox that fails is
 * recorded on its own row and does not stop the others. */
export async function pollAllMailboxes(): Promise<void> {
  if (sweepInFlight) return;
  sweepInFlight = true;
  try {
    const accounts = await MailAutomationAccountModel.find({
      is_active: true,
      refresh_token: { $ne: '' },
    });
    for (const account of accounts) {
      try {
        await pollAccount(account);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        await MailAutomationAccountModel.updateOne(
          { _id: account._id },
          { $set: { last_error: reason.slice(0, 500), last_polled_at: new Date() } }
        );
        logs.server.error('mail-automation', 'pollAllMailboxes', {
          error,
          mailbox: account.email,
          msg: 'poll failed for this mailbox',
        });
      }
    }
  } finally {
    sweepInFlight = false;
  }
}

/** Start the poll loop. Returns a stop function. No-ops under NODE_ENV=test,
 * mirroring the telemetry and pod-draft schedulers. */
export function startMailAutomationScheduler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  const sweep = () => {
    pollAllMailboxes().catch((error) => {
      logs.server.error('mail-automation', 'sweep', { error, msg: 'sweep failed' });
    });
  };
  const first = setTimeout(sweep, FIRST_POLL_DELAY_MS);
  const interval = setInterval(sweep, POLL_INTERVAL_MS);
  first.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}

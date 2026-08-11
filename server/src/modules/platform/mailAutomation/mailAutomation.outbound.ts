import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { MailAutomationAccountModel, MailAutomationThreadModel } from './mailAutomation.model';
import { getMessage, sendReply } from './gmail.api';
import { mailAutomationService } from './mailAutomation.service';

/**
 * An agent's ticket reply, delivered where the sender actually is.
 *
 * A ticket with source EMAIL was opened from a connected Gmail mailbox, and
 * its sender is holding an email thread — possibly with no Duncit account at
 * all, so their inbox is the only place an answer can reach them. The reply
 * therefore goes out AS EMAIL, and specifically:
 *
 * - FROM THE SAME MAILBOX the message arrived in. The thread row carries the
 *   mailbox by address (it survives a reconnect), and the send uses that
 *   account's own OAuth token — never a generic SMTP identity. When the
 *   customer hits Reply, it lands back in the same mailbox, where the
 *   poller's same-thread rule keeps the automation out of a conversation a
 *   human now holds.
 * - ON THE SAME CONVERSATION. In-Reply-To/References from the message that
 *   opened the thread are what make the sender's OWN mail client show this as
 *   part of their conversation; Gmail's threadId keeps it threaded on ours.
 *
 * Never throws: the reply is already saved on the ticket when this runs, and
 * the caller turns a failure into a SYSTEM note on the ticket — a recorded
 * "the email did not go", never a thrown error that fakes the reply itself
 * failing, and never a silent success that fakes a delivery.
 */

export interface AgentReplyOutcome {
  sent: boolean;
  /** Why the email did not go, in a sentence an agent can read. Empty when sent. */
  reason: string;
}

const failure = (reason: string): AgentReplyOutcome => ({ sent: false, reason });

export async function sendAgentTicketReply(
  ticketId: string,
  bodyText: string
): Promise<AgentReplyOutcome> {
  try {
    const thread = await MailAutomationThreadModel.findOne({
      ticket_id: new Types.ObjectId(ticketId),
    }).lean();
    if (!thread) return failure('No mailbox conversation is linked to this ticket.');
    if (!thread.from_email) return failure('The mailbox conversation has no sender address.');

    const account = await MailAutomationAccountModel.findOne({ email: thread.mailbox_email });
    if (!account?.refresh_token) {
      return failure(`The mailbox ${thread.mailbox_email} is no longer connected.`);
    }
    // A paused mailbox (is_active false) stops the AUTOMATION, not the humans —
    // an agent's reply still goes out as long as the Google grant stands.
    const token = await mailAutomationService.accessTokenFor(account);

    // Thread under the message that opened the conversation. If Gmail no
    // longer serves it, send with threadId alone — the reply still reaches the
    // sender, just possibly as a fresh conversation in their client.
    let inReplyTo = '';
    let references = '';
    if (thread.gmail_message_id) {
      try {
        const opener = await getMessage(token, thread.gmail_message_id);
        inReplyTo = opener.messageIdHeader;
        references = opener.referencesHeader;
      } catch (error) {
        logs.server.warn('mail-automation', 'sendAgentTicketReply', {
          error,
          mailbox: thread.mailbox_email,
          msg: 'opener message unavailable; sending with threadId-only threading',
        });
      }
    }

    await sendReply(token, {
      fromEmail: account.email,
      fromName: account.display_name || 'Duncit',
      toEmail: thread.from_email,
      subject: thread.subject || 'Your message',
      bodyText,
      threadId: thread.gmail_thread_id,
      inReplyTo,
      references,
      // A human wrote this one.
      autoReply: false,
    });
    return { sent: true, reason: '' };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logs.server.error('mail-automation', 'sendAgentTicketReply', {
      error,
      ticket_id: ticketId,
      msg: 'agent reply could not be emailed to the sender',
    });
    return failure(reason.slice(0, 300));
  }
}

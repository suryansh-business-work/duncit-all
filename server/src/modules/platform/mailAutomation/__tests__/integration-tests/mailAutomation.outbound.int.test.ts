/**
 * An agent's ticket reply going out as email, against a real database: the
 * thread row and the mailbox account are real; Gmail and the access token are
 * mocked. The function never throws — every refusal is a reason a person can read.
 */
jest.mock('@modules/platform/mailAutomation/gmail.api', () => ({
  ...jest.requireActual('@modules/platform/mailAutomation/gmail.api'),
  getMessage: jest.fn(),
  sendReply: jest.fn(),
}));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { getMessage, sendReply } from '../../gmail.api';
import { MailAutomationAccountModel, MailAutomationThreadModel } from '../../mailAutomation.model';
import { mailAutomationService } from '../../mailAutomation.service';
import { sendAgentTicketReply } from '../../mailAutomation.outbound';

const m = (fn: unknown) => fn as jest.Mock;
const MAILBOX = 'support@duncit.com';
const TICKET = new Types.ObjectId();

const account = (over: Record<string, unknown> = {}) =>
  MailAutomationAccountModel.create({ email: MAILBOX, refresh_token: 'rt', display_name: 'Duncit Support', ...over });
const thread = (over: Record<string, unknown> = {}) =>
  MailAutomationThreadModel.create({
    mailbox_email: MAILBOX, gmail_thread_id: 'T1', gmail_message_id: 'M1', from_email: 'asha@example.com', from_name: 'Asha',
    subject: 'Refund', ticket_type: 'SUPPORT', ticket_id: TICKET, ...over,
  });

beforeEach(() => {
  m(getMessage).mockReset();
  m(sendReply).mockReset().mockResolvedValue('sent-id');
  m(getMessage).mockResolvedValue({ messageIdHeader: '<m1@mail>', referencesHeader: '<root@mail>' });
  jest.spyOn(mailAutomationService, 'accessTokenFor').mockResolvedValue('tok');
  jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined as never);
  jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
});
afterEach(() => jest.restoreAllMocks());

describe('sendAgentTicketReply', () => {
  it('sends from the mailbox the mail arrived in, on the same conversation, as a human reply', async () => {
    await account();
    await thread();
    await expect(sendAgentTicketReply(String(TICKET), 'We are on it.')).resolves.toEqual({ sent: true, reason: '' });
    expect(getMessage).toHaveBeenCalledWith('tok', 'M1');
    expect(sendReply).toHaveBeenCalledWith('tok', {
      fromEmail: MAILBOX, fromName: 'Duncit Support', toEmail: 'asha@example.com', subject: 'Refund', bodyText: 'We are on it.',
      threadId: 'T1', inReplyTo: '<m1@mail>', references: '<root@mail>', autoReply: false,
    });
  });

  it('names the sender Duncit and the subject "Your message" when the mailbox and mail have neither', async () => {
    await account({ display_name: '' });
    await thread({ subject: '' });
    await sendAgentTicketReply(String(TICKET), 'Hi');
    expect(sendReply).toHaveBeenCalledWith('tok', expect.objectContaining({ fromName: 'Duncit', subject: 'Your message' }));
  });

  it('threads by thread id alone when Gmail no longer serves the opening message, and says so in the log', async () => {
    await account();
    await thread();
    m(getMessage).mockRejectedValue(new Error('gone'));
    await expect(sendAgentTicketReply(String(TICKET), 'Hi')).resolves.toMatchObject({ sent: true });
    expect(sendReply).toHaveBeenCalledWith('tok', expect.objectContaining({ inReplyTo: '', references: '', threadId: 'T1' }));
    expect(logs.server.warn).toHaveBeenCalledWith('mail-automation', 'sendAgentTicketReply', expect.objectContaining({ mailbox: MAILBOX }));
  });

  it('does not fetch an opening message when the thread never recorded one', async () => {
    await account();
    await thread({ gmail_message_id: '' });
    await sendAgentTicketReply(String(TICKET), 'Hi');
    expect(getMessage).not.toHaveBeenCalled();
    expect(sendReply).toHaveBeenCalled();
  });

  it('says why when no conversation is linked, or it has no sender address', async () => {
    await expect(sendAgentTicketReply(String(TICKET), 'Hi')).resolves.toEqual({ sent: false, reason: 'No mailbox conversation is linked to this ticket.' });
    await thread({ from_email: '' });
    await expect(sendAgentTicketReply(String(TICKET), 'Hi')).resolves.toEqual({ sent: false, reason: 'The mailbox conversation has no sender address.' });
    expect(sendReply).not.toHaveBeenCalled();
  });

  it('says the mailbox is no longer connected when it was removed or lost its grant', async () => {
    await thread();
    await expect(sendAgentTicketReply(String(TICKET), 'Hi')).resolves.toEqual({ sent: false, reason: `The mailbox ${MAILBOX} is no longer connected.` });
    await account({ refresh_token: '' });
    await expect(sendAgentTicketReply(String(TICKET), 'Hi')).resolves.toMatchObject({ sent: false, reason: expect.stringContaining('no longer connected') });
  });

  it('still sends from a paused mailbox, since pausing stops the automation and not the humans', async () => {
    await account({ is_active: false });
    await thread();
    await expect(sendAgentTicketReply(String(TICKET), 'Hi')).resolves.toMatchObject({ sent: true });
  });

  it('returns a failure, cut to 300 characters and logged, when Gmail refuses the send', async () => {
    await account();
    await thread();
    m(sendReply).mockRejectedValue(new Error('q'.repeat(500)));
    const out = await sendAgentTicketReply(String(TICKET), 'Hi');
    expect(out.sent).toBe(false);
    expect(out.reason).toHaveLength(300);
    expect(logs.server.error).toHaveBeenCalledWith('mail-automation', 'sendAgentTicketReply', expect.objectContaining({ ticket_id: String(TICKET) }));
  });

  it('reports a failure that was not an Error by its text, and a malformed ticket id as a failure rather than a throw', async () => {
    await account();
    await thread();
    m(sendReply).mockRejectedValue('plain');
    await expect(sendAgentTicketReply(String(TICKET), 'Hi')).resolves.toEqual({ sent: false, reason: 'plain' });
    await expect(sendAgentTicketReply('not-an-object-id', 'Hi')).resolves.toMatchObject({ sent: false });
  });
});

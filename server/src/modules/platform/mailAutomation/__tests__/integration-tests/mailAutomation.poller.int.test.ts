/**
 * The mailbox poll loop against a real database — the thread rows and their
 * unique (mailbox, thread) claim are real; Gmail, ticket opening, the reply
 * composer, AI > Automation and the access token are mocked.
 */
jest.mock('@modules/platform/mailAutomation/gmail.api', () => ({
  ...jest.requireActual('@modules/platform/mailAutomation/gmail.api'),
  getMessage: jest.fn(),
  getProfile: jest.fn(),
  listAddedMessages: jest.fn(),
  sendReply: jest.fn(),
}));
jest.mock('@modules/platform/mailAutomation/mailAutomation.tickets', () => ({ openTicketForEmail: jest.fn() }));
jest.mock('@modules/platform/mailAutomation/mailAutomation.reply', () => ({
  ...jest.requireActual('@modules/platform/mailAutomation/mailAutomation.reply'),
  composeReply: jest.fn(),
}));
jest.mock('@modules/ai/automation/automation.inbound', () => ({ inboundEmail: jest.fn() }));
jest.mock('@utils/clusterJob', () => ({ startClusterJob: jest.fn(() => () => undefined) }));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
import { inboundEmail } from '@modules/ai/automation/automation.inbound';
import { getMessage, getProfile, HistoryExpiredError, listAddedMessages, sendReply } from '../../gmail.api';
import { openTicketForEmail } from '../../mailAutomation.tickets';
import { composeReply } from '../../mailAutomation.reply';
import { MailAutomationAccountModel, MailAutomationThreadModel } from '../../mailAutomation.model';
import { mailAutomationService } from '../../mailAutomation.service';
import { pollAccount, pollAllMailboxes, startMailAutomationScheduler } from '../../mailAutomation.poller';

const m = (fn: unknown) => fn as jest.Mock;
const MAILBOX = 'support@duncit.com';
const TICKET_ID = new Types.ObjectId();

const mailbox = (over: Record<string, unknown> = {}) =>
  MailAutomationAccountModel.create({ email: MAILBOX, refresh_token: 'rt', last_history_id: '100', display_name: 'Duncit Support', ...over });

const inbound = (over: Record<string, unknown> = {}) => ({
  id: 'm1',
  threadId: 't1',
  fromEmail: 'pet.parent@example.com',
  fromName: 'Pet Parent',
  subject: 'Refund please',
  bodyText: 'My pod was cancelled.',
  messageIdHeader: '<m1@mail>',
  referencesHeader: '',
  isAutomated: false,
  ...over,
});

const arrivals = (refs: { id: string; threadId: string }[], historyId = '200', truncated = false) =>
  m(listAddedMessages).mockResolvedValue({ messages: refs, historyId, truncated });

let tokenSpy: jest.SpyInstance;
beforeAll(async () => {
  await MailAutomationThreadModel.init();
});
beforeEach(() => {
  for (const fn of [getMessage, getProfile, listAddedMessages, sendReply, openTicketForEmail, composeReply, inboundEmail]) m(fn).mockReset();
  tokenSpy = jest.spyOn(mailAutomationService, 'accessTokenFor').mockResolvedValue('tok');
  m(openTicketForEmail).mockResolvedValue({ ticket_id: TICKET_ID, ticket_no: 'SUP-000123' });
  m(composeReply).mockResolvedValue({ text: 'We logged SUP-000123', byAi: true });
  m(sendReply).mockResolvedValue('sent-id');
  m(inboundEmail).mockResolvedValue({ started: 0 });
});
afterEach(() => tokenSpy.mockRestore());

describe('pollAccount — cursor', () => {
  it('baselines a mailbox with no cursor without answering anything', async () => {
    const acc = await mailbox({ last_history_id: '' });
    m(getProfile).mockResolvedValue({ emailAddress: MAILBOX, historyId: '555' });
    await pollAccount(acc);
    expect(getProfile).toHaveBeenCalledWith('tok');
    expect(listAddedMessages).not.toHaveBeenCalled();
    const saved = await MailAutomationAccountModel.findById(acc._id).lean();
    expect(saved?.last_history_id).toBe('555');
    expect(saved?.last_polled_at).toBeInstanceOf(Date);
  });

  it('re-baselines, with a warning, when Gmail has expired the cursor', async () => {
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined as never);
    const acc = await mailbox();
    m(listAddedMessages).mockRejectedValue(new HistoryExpiredError());
    m(getProfile).mockResolvedValue({ emailAddress: MAILBOX, historyId: '777' });
    await pollAccount(acc);
    expect((await MailAutomationAccountModel.findById(acc._id).lean())?.last_history_id).toBe('777');
    expect(warn).toHaveBeenCalledWith('mail-automation', 'pollAccount', expect.objectContaining({ mailbox: MAILBOX }));
    warn.mockRestore();
  });

  it('rethrows any other history failure, leaving the cursor alone', async () => {
    const acc = await mailbox();
    m(listAddedMessages).mockRejectedValue(new Error('500 backend error'));
    await expect(pollAccount(acc)).rejects.toThrow('500 backend error');
    expect((await MailAutomationAccountModel.findById(acc._id).lean())?.last_history_id).toBe('100');
  });

  it('advances the cursor and clears the last error after a sweep, noting a truncated walk', async () => {
    const info = jest.spyOn(logs.server, 'info').mockImplementation(() => undefined as never);
    const acc = await mailbox({ last_error: 'old failure' });
    arrivals([], '250', true);
    await pollAccount(acc);
    expect(listAddedMessages).toHaveBeenCalledWith('tok', '100');
    expect(await MailAutomationAccountModel.findById(acc._id).lean()).toMatchObject({ last_history_id: '250', last_error: '' });
    expect(info).toHaveBeenCalledWith('mail-automation', 'pollAccount', expect.objectContaining({ mailbox: MAILBOX }));
    info.mockRestore();
  });
});

describe('pollAccount — answering', () => {
  it('opens a ticket, replies on the thread and records both', async () => {
    const acc = await mailbox({ ticket_type: 'GRIEVANCE' });
    arrivals([{ id: 'm1', threadId: 't1' }]);
    m(getMessage).mockResolvedValue(inbound({ referencesHeader: '<r0@mail>' }));

    await pollAccount(acc);

    expect(inboundEmail).toHaveBeenCalledWith({
      mailbox: MAILBOX,
      fromEmail: 'pet.parent@example.com',
      fromName: 'Pet Parent',
      subject: 'Refund please',
      text: 'My pod was cancelled.',
    });
    expect(openTicketForEmail).toHaveBeenCalledWith('GRIEVANCE', {
      fromEmail: 'pet.parent@example.com',
      fromName: 'Pet Parent',
      subject: 'Refund please',
      bodyText: 'My pod was cancelled.',
    });
    expect(m(composeReply).mock.calls[0][1]).toEqual({
      ticketNo: 'SUP-000123',
      senderName: 'Pet Parent',
      senderEmail: 'pet.parent@example.com',
      subject: 'Refund please',
      bodyText: 'My pod was cancelled.',
    });
    expect(sendReply).toHaveBeenCalledWith('tok', {
      fromEmail: MAILBOX,
      fromName: 'Duncit Support',
      toEmail: 'pet.parent@example.com',
      subject: 'Refund please',
      bodyText: 'We logged SUP-000123',
      threadId: 't1',
      inReplyTo: '<m1@mail>',
      references: '<r0@mail>',
    });
    const row = await MailAutomationThreadModel.findOne().lean();
    expect(row).toMatchObject({
      mailbox_email: MAILBOX,
      gmail_thread_id: 't1',
      gmail_message_id: 'm1',
      ticket_type: 'GRIEVANCE',
      ticket_no: 'SUP-000123',
      reply_by_ai: true,
      reply_error: '',
    });
    expect(String(row?.ticket_id)).toBe(String(TICKET_ID));
    expect(row?.replied_at).toBeInstanceOf(Date);
  });

  it('falls back to a default sender name and subject on the reply', async () => {
    const acc = await mailbox({ display_name: '' });
    arrivals([{ id: 'm1', threadId: 't1' }]);
    m(getMessage).mockResolvedValue(inbound({ subject: '' }));
    await pollAccount(acc);
    expect(m(sendReply).mock.calls[0][1]).toMatchObject({ fromName: 'Duncit', subject: 'Your message' });
  });

  it.each([
    ['no sender', { fromEmail: '' }],
    ['our own reply', { fromEmail: MAILBOX }],
    ['an auto-responder', { isAutomated: true }],
  ])('ignores %s', async (_label, over) => {
    const acc = await mailbox();
    arrivals([{ id: 'm1', threadId: 't1' }]);
    m(getMessage).mockResolvedValue(inbound(over));
    await pollAccount(acc);
    expect(inboundEmail).not.toHaveBeenCalled();
    expect(openTicketForEmail).not.toHaveBeenCalled();
    expect(await MailAutomationThreadModel.countDocuments()).toBe(0);
  });

  it('leaves a thread that already has a ticket to the humans, without fetching it', async () => {
    const acc = await mailbox();
    await MailAutomationThreadModel.create({ mailbox_email: MAILBOX, gmail_thread_id: 't1', ticket_type: 'SUPPORT', ticket_no: 'SUP-1' });
    arrivals([{ id: 'm2', threadId: 't1' }]);
    await pollAccount(acc);
    expect(getMessage).not.toHaveBeenCalled();
    expect(sendReply).not.toHaveBeenCalled();
  });

  it('finishes an interrupted claim (row without a ticket) instead of skipping it', async () => {
    const acc = await mailbox({ ticket_type: 'REPORT_PROBLEM' });
    await MailAutomationThreadModel.create({ mailbox_email: MAILBOX, gmail_thread_id: 't1', ticket_type: 'SUPPORT' });
    arrivals([{ id: 'm1', threadId: 't1' }]);
    m(getMessage).mockResolvedValue(inbound());
    await pollAccount(acc);
    expect(openTicketForEmail).toHaveBeenCalledTimes(1);
    const rows = await MailAutomationThreadModel.find().lean();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ ticket_no: 'SUP-000123', ticket_type: 'REPORT_PROBLEM' });
  });

  it('opens one ticket when a thread is claimed between the check and the insert', async () => {
    const acc = await mailbox();
    arrivals([{ id: 'm1', threadId: 't1' }]);
    // Another process claims the thread while this one fetches the message.
    m(getMessage).mockImplementation(async () => {
      await MailAutomationThreadModel.create({ mailbox_email: MAILBOX, gmail_thread_id: 't1', ticket_type: 'SUPPORT' });
      return inbound();
    });
    await pollAccount(acc);
    expect(openTicketForEmail).not.toHaveBeenCalled();
    expect(await MailAutomationThreadModel.countDocuments()).toBe(1);
  });

  it('records a failed acknowledgement on the row, keeping the ticket', async () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    const acc = await mailbox();
    arrivals([{ id: 'm1', threadId: 't1' }]);
    m(getMessage).mockResolvedValue(inbound());
    m(sendReply).mockRejectedValue(new Error('x'.repeat(600)));
    await pollAccount(acc);
    const row = await MailAutomationThreadModel.findOne().lean();
    expect(row).toMatchObject({ ticket_no: 'SUP-000123', replied_at: null });
    expect(row?.reply_error).toHaveLength(500);
    expect(error).toHaveBeenCalledWith('mail-automation', 'answerMessage', expect.objectContaining({ ticket_no: 'SUP-000123' }));
    error.mockRestore();
  });

  it('records a non-Error send failure as text', async () => {
    const quiet = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    const acc = await mailbox();
    arrivals([{ id: 'm1', threadId: 't1' }]);
    m(getMessage).mockResolvedValue(inbound());
    m(sendReply).mockRejectedValue('quota exceeded');
    await pollAccount(acc);
    expect((await MailAutomationThreadModel.findOne().lean())?.reply_error).toBe('quota exceeded');
    quiet.mockRestore();
  });

  it('logs an AI > Automation failure as a warning without affecting the ticket', async () => {
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined as never);
    const acc = await mailbox();
    arrivals([{ id: 'm1', threadId: 't1' }]);
    m(getMessage).mockResolvedValue(inbound());
    m(inboundEmail).mockRejectedValue(new Error('flow broke'));
    await pollAccount(acc);
    for (let i = 0; i < 100 && warn.mock.calls.length === 0; i += 1) await new Promise((r) => setTimeout(r, 5));
    expect(warn).toHaveBeenCalledWith('mail-automation', 'automation', { error: expect.any(Error), mailbox: MAILBOX });
    expect(sendReply).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('isolates a message that throws, records it, and still answers the next one and moves the cursor', async () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    const acc = await mailbox();
    arrivals([
      { id: 'm1', threadId: 't1' },
      { id: 'm2', threadId: 't2' },
      { id: 'm3', threadId: 't3' },
    ], '300');
    m(getMessage).mockImplementation(async (_t: string, id: string) => {
      if (id === 'm3') throw new Error('malformed MIME');
      return inbound({ id, threadId: id === 'm1' ? 't1' : 't2' });
    });
    m(openTicketForEmail)
      .mockRejectedValueOnce('db down')
      .mockResolvedValue({ ticket_id: TICKET_ID, ticket_no: 'SUP-2' });

    await pollAccount(acc);

    const rows = await MailAutomationThreadModel.find().sort({ gmail_thread_id: 1 }).lean();
    expect(rows.map((r) => [r.gmail_thread_id, r.ticket_no, r.reply_error])).toEqual([
      ['t1', '', 'db down'],
      ['t2', 'SUP-2', ''],
    ]);
    expect(error).toHaveBeenCalledWith('mail-automation', 'handleArrival', expect.objectContaining({ gmail_message_id: 'm3', gmail_thread_id: 't3' }));
    expect((await MailAutomationAccountModel.findById(acc._id).lean())?.last_history_id).toBe('300');
    error.mockRestore();
  });
});

describe('pollAllMailboxes', () => {
  it('polls only active, connected mailboxes and records a failure on that mailbox alone', async () => {
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    const good = await mailbox({ email: 'good@duncit.com' });
    const bad = await mailbox({ email: 'bad@duncit.com' });
    await mailbox({ email: 'off@duncit.com', is_active: false });
    await mailbox({ email: 'revoked@duncit.com', refresh_token: '' });
    tokenSpy.mockImplementation(async (account: { email: string }) => {
      if (account.email === 'bad@duncit.com') throw new Error('invalid_grant');
      return 'tok';
    });
    arrivals([], '400');

    await pollAllMailboxes();

    expect(tokenSpy.mock.calls.map((c) => c[0].email).sort((a: string, b: string) => a.localeCompare(b))).toEqual([
      'bad@duncit.com',
      'good@duncit.com',
    ]);
    const [g, b] = await Promise.all([good, bad].map((d) => MailAutomationAccountModel.findById(d._id).lean()));
    expect(g).toMatchObject({ last_history_id: '400', last_error: '' });
    expect(b).toMatchObject({ last_history_id: '100', last_error: 'invalid_grant' });
    expect(b?.last_polled_at).toBeInstanceOf(Date);
    expect(error).toHaveBeenCalledWith('mail-automation', 'pollAllMailboxes', expect.objectContaining({ mailbox: 'bad@duncit.com' }));
    error.mockRestore();
  });

  it('records a non-Error failure as text', async () => {
    const quiet = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    const acc = await mailbox();
    tokenSpy.mockRejectedValue('offline');
    await pollAllMailboxes();
    expect((await MailAutomationAccountModel.findById(acc._id).lean())?.last_error).toBe('offline');
    quiet.mockRestore();
  });

  it('never runs two sweeps at once, and runs again once the first is done', async () => {
    await mailbox();
    let release: (v: string) => void = () => undefined;
    tokenSpy.mockImplementationOnce(() => new Promise<string>((resolve) => (release = resolve)));
    arrivals([], '500');

    const first = pollAllMailboxes();
    for (let i = 0; i < 100 && tokenSpy.mock.calls.length === 0; i += 1) await new Promise((r) => setTimeout(r, 5));
    await pollAllMailboxes();
    expect(tokenSpy).toHaveBeenCalledTimes(1);

    release('tok');
    await first;
    tokenSpy.mockResolvedValue('tok');
    await pollAllMailboxes();
    expect(tokenSpy).toHaveBeenCalledTimes(2);
  });
});

describe('startMailAutomationScheduler', () => {
  it('registers the sweep as a cluster job every two minutes, first after thirty seconds', () => {
    const stop = startMailAutomationScheduler();
    expect(typeof stop).toBe('function');
    expect(startClusterJob).toHaveBeenCalledWith({
      component: 'mail-automation',
      operation: 'sweep',
      firstDelayMs: 30_000,
      intervalMs: 120_000,
      run: pollAllMailboxes,
    });
  });
});

/**
 * What the poll loop does when recording a message itself fails: an error that
 * is not a duplicate claim is handled per message, and a failure to even note
 * the failure on the thread row does not stop the sweep.
 */
jest.mock('@modules/platform/mailAutomation/gmail.api', () => ({
  ...jest.requireActual('@modules/platform/mailAutomation/gmail.api'),
  getMessage: jest.fn(),
  getProfile: jest.fn(),
  listAddedMessages: jest.fn(),
  sendReply: jest.fn(),
}));
jest.mock('@modules/platform/mailAutomation/mailAutomation.tickets', () => ({ openTicketForEmail: jest.fn() }));
jest.mock('@modules/ai/automation/automation.inbound', () => ({ inboundEmail: jest.fn() }));

import { logs } from '@observability/log';
import { getMessage, listAddedMessages } from '../../gmail.api';
import { MailAutomationAccountModel, MailAutomationThreadModel } from '../../mailAutomation.model';
import { mailAutomationService } from '../../mailAutomation.service';
import { pollAccount } from '../../mailAutomation.poller';
import { inboundEmail } from '@modules/ai/automation/automation.inbound';

const m = (fn: unknown) => fn as jest.Mock;

const inbound = {
  id: 'm1', threadId: 't1', fromEmail: 'pet.parent@example.com', fromName: 'Pet Parent', subject: 'Refund', bodyText: 'Hello',
  messageIdHeader: '<m1@mail>', referencesHeader: '', isAutomated: false,
};

beforeEach(() => {
  m(getMessage).mockReset().mockResolvedValue(inbound);
  m(inboundEmail).mockReset().mockResolvedValue({ started: 0 });
  m(listAddedMessages).mockReset().mockResolvedValue({ messages: [{ id: 'm1', threadId: 't1' }], historyId: '200', truncated: false });
  jest.spyOn(mailAutomationService, 'accessTokenFor').mockResolvedValue('tok');
  jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
});
afterEach(() => jest.restoreAllMocks());

describe('a message the loop cannot record', () => {
  it('rethrows a claim failure that is not a duplicate, logs it, and still advances the cursor', async () => {
    const acc = await MailAutomationAccountModel.create({ email: 'support@duncit.com', refresh_token: 'rt', last_history_id: '100' });
    jest.spyOn(MailAutomationThreadModel, 'create').mockRejectedValue(new Error('database is down'));
    await pollAccount(acc);
    expect(logs.server.error).toHaveBeenCalledWith('mail-automation', 'handleArrival', expect.objectContaining({ gmail_message_id: 'm1' }));
    expect((await MailAutomationAccountModel.findById(acc._id).lean())?.last_history_id).toBe('200');
  });

  it('carries on when noting the failure on the thread row fails as well', async () => {
    const acc = await MailAutomationAccountModel.create({ email: 'support@duncit.com', refresh_token: 'rt', last_history_id: '100' });
    jest.spyOn(MailAutomationThreadModel, 'create').mockRejectedValue(new Error('database is down'));
    jest.spyOn(MailAutomationThreadModel, 'updateOne').mockImplementation(() => Promise.reject(new Error('write failed')) as never);
    await expect(pollAccount(acc)).resolves.toBeUndefined();
    expect((await MailAutomationAccountModel.findById(acc._id).lean())?.last_history_id).toBe('200');
  });
});
